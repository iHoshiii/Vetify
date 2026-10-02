import { Binary, ObjectId } from 'mongodb';
import {
  BOOK_AFFILIATE_CENTAVOS,
  BOOK_AFFILIATE_DOWNLOAD_LIMIT,
  type BookAffiliatePage,
  type BookSummary,
  type BookStatus,
  type BookUploadSummary,
} from '@shared/books';
import { getDb } from '../config/db';

export type BookDocument = Omit<BookSummary, 'id' | 'createdAt'> & {
  _id: ObjectId;
  author: ObjectId;
  createdAt: Date;
  pdf: Binary;
  // Missing on older uploads: they remain private until the scanner checks them.
  status?: BookStatus;
  contentHash?: string;
  moderation?: {
    rulesVersion?: string;
    model?: string;
    checkedAt?: Date;
    reason?: string;
    evidence?: { page: number; excerpt: string }[];
    topics?: string[];
    documentType?: string;
    attempts?: number;
    uncertainChecks?: number;
    nextCheckAt?: Date;
    lockUntil?: Date;
    token?: string;
  };
};
type Quota = {
  _id: string;
  used: number;
  author?: ObjectId;
  bookId?: ObjectId;
  month?: string;
  earningsCentavos?: number;
  paidDownloads?: number;
  downloads?: { id: ObjectId; at: Date; earningsCentavos: number }[];
};
export const booksCollection = () => getDb().collection<BookDocument>('books');
export const quotasCollection = () => getDb().collection<Quota>('book_download_quotas');
export function bookSummary(book: Omit<BookDocument, 'pdf'>): BookSummary {
  return {
    id: book._id.toString(),
    title: book.title,
    description: book.description,
    topic: book.topic,
    uploadedBy: book.uploadedBy,
    size: book.size,
    createdAt: book.createdAt.toISOString(),
  };
}
export function bookUploadSummary(book: Omit<BookDocument, 'pdf'>): BookUploadSummary {
  return {
    ...bookSummary(book),
    status: book.status ?? 'pending',
    reason: book.moderation?.reason ?? null,
  };
}
// Calendar months follow the application's Singapore time zone, including at midnight.
export function bookMonth(now = new Date()) {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  return {
    key: `${year}-${month + 1}`,
    resetsAt: new Date(Date.UTC(year, month + 1, 1) - 8 * 60 * 60 * 1000).toISOString(),
  };
}
function quotaId(userId: string, bookId: string, month: string) {
  return `${userId}:${bookId}:${month}`;
}
export async function bookAllowance(userId: string, bookId: string, now = new Date()) {
  const month = bookMonth(now);
  const quota = await quotasCollection().findOne({ _id: quotaId(userId, bookId, month.key) });
  const used = quota?.used ?? 0;
  // Remaining commission slots only; book downloads are always allowed.
  return {
    used,
    remaining: Math.max(0, BOOK_AFFILIATE_DOWNLOAD_LIMIT - used),
    resetsAt: month.resetsAt,
  };
}
export async function recordBookCommission(
  userId: string,
  bookId: string,
  now = new Date(),
  author?: ObjectId
) {
  const month = bookMonth(now).key;
  const _id = quotaId(userId, bookId, month);
  const earningsCentavos = author && author.toString() !== userId ? BOOK_AFFILIATE_CENTAVOS : 0;
  // The deterministic primary key serializes initialization even across servers.
  try {
    await quotasCollection().updateOne({ _id }, { $setOnInsert: { used: 0 } }, { upsert: true });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  return quotasCollection().findOneAndUpdate(
    { _id, used: { $lt: BOOK_AFFILIATE_DOWNLOAD_LIMIT } },
    {
      // Only the first three downloads consume a commission slot. Returning null
      // means no commission is due; it never prevents serving the PDF.
      $inc: {
        used: 1,
        ...(author ? { earningsCentavos, paidDownloads: earningsCentavos > 0 ? 1 : 0 } : {}),
      },
      ...(author
        ? {
            $set: { author, bookId: new ObjectId(bookId), month },
            $push: { downloads: { id: new ObjectId(), at: now, earningsCentavos } },
          }
        : {}),
    },
    { returnDocument: 'after' }
  );
}

async function affiliateCharts(author: ObjectId, now: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  const singaporeOffset = 8 * 60 * 60 * 1000;
  const today = new Date(now.getTime() + singaporeOffset).toISOString().slice(0, 10);
  const firstDay = Date.parse(`${today}T00:00:00Z`) - 29 * dayMs;
  const from = new Date(firstDay - singaporeOffset);
  const [activity, ranking] = await Promise.all([
    quotasCollection()
      .aggregate<{ _id: string; earningsCentavos: number; downloads: number }>([
        { $match: { author, 'downloads.at': { $gte: from, $lte: now } } },
        { $unwind: '$downloads' },
        {
          $match: {
            'downloads.at': { $gte: from, $lte: now },
            'downloads.earningsCentavos': { $gt: 0 },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$downloads.at',
                timezone: 'Asia/Singapore',
              },
            },
            earningsCentavos: { $sum: '$downloads.earningsCentavos' },
            downloads: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    quotasCollection()
      .aggregate<{ _id: ObjectId; earningsCentavos: number; downloads: number }>([
        { $match: { author, paidDownloads: { $gt: 0 } } },
        {
          $group: {
            _id: '$bookId',
            downloads: { $sum: '$paidDownloads' },
            earningsCentavos: { $sum: '$earningsCentavos' },
          },
        },
        { $sort: { downloads: -1, earningsCentavos: -1, _id: 1 } },
        { $limit: 5 },
      ])
      .toArray(),
  ]);
  const titles = await booksCollection()
    .find(
      { author, _id: { $in: ranking.map((row) => row._id) } },
      { projection: { _id: 1, title: 1 } }
    )
    .toArray();
  const titleById = new Map(titles.map((book) => [book._id.toString(), book.title]));
  const activityByDay = new Map(activity.map((row) => [row._id, row]));
  return {
    // Explicit zeroes show quiet days without inventing activity.
    daily: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(firstDay + index * dayMs).toISOString().slice(0, 10);
      const row = activityByDay.get(date);
      return { date, earningsCentavos: row?.earningsCentavos ?? 0, downloads: row?.downloads ?? 0 };
    }),
    topBooks: ranking.map((row) => ({
      id: row._id.toString(),
      title: titleById.get(row._id.toString()) ?? 'Unavailable book',
      downloads: row.downloads,
      earningsCentavos: row.earningsCentavos,
    })),
  };
}

export async function bookAffiliatePage(
  author: ObjectId,
  page: number,
  now = new Date()
): Promise<BookAffiliatePage> {
  const month = bookMonth(now).key;
  const limit = 12;
  const [items, total, totals, charts] = await Promise.all([
    booksCollection()
      .find({ author }, { projection: { _id: 1, title: 1 } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    booksCollection().countDocuments({ author }),
    quotasCollection()
      .aggregate<{ earningsCentavos: number; monthEarningsCentavos: number; downloads: number }>([
        { $match: { author } },
        {
          $group: {
            _id: null,
            earningsCentavos: { $sum: '$earningsCentavos' },
            monthEarningsCentavos: {
              $sum: { $cond: [{ $eq: ['$month', month] }, '$earningsCentavos', 0] },
            },
            downloads: { $sum: '$paidDownloads' },
          },
        },
      ])
      .toArray(),
    affiliateCharts(author, now),
  ]);
  const breakdown = await quotasCollection()
    .aggregate<{ _id: ObjectId; downloads: number; earningsCentavos: number }>([
      { $match: { author, bookId: { $in: items.map((book) => book._id) } } },
      {
        $group: {
          _id: '$bookId',
          downloads: { $sum: '$paidDownloads' },
          earningsCentavos: { $sum: '$earningsCentavos' },
        },
      },
    ])
    .toArray();
  const byBook = new Map(breakdown.map((row) => [row._id.toString(), row]));
  return {
    earningsCentavos: totals[0]?.earningsCentavos ?? 0,
    monthEarningsCentavos: totals[0]?.monthEarningsCentavos ?? 0,
    downloads: totals[0]?.downloads ?? 0,
    rateCentavos: BOOK_AFFILIATE_CENTAVOS,
    ...charts,
    items: items.map((book) => ({
      id: book._id.toString(),
      title: book.title,
      downloads: byBook.get(book._id.toString())?.downloads ?? 0,
      earningsCentavos: byBook.get(book._id.toString())?.earningsCentavos ?? 0,
    })),
    page,
    pages: Math.ceil(total / limit),
  };
}
