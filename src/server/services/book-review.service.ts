import { createHash, randomUUID } from 'node:crypto';
import { findProfessionalByUser } from '../models/professionals';
import { findUserById } from '../models/users';
import { booksCollection } from '../models/books';
import { currentStatus } from './user-status.service';
import { screenBook, BOOK_SCREENING_RULES_VERSION } from './book-screening.service';

// A durable Mongo queue. A server restart or expired worker lease cannot lose an upload.
export async function checkNextBook(now = new Date()): Promise<boolean> {
  const token = randomUUID();
  const book = await booksCollection().findOneAndUpdate(
    {
      $and: [
        { $or: [{ status: { $in: ['pending', 'checking'] } }, { status: { $exists: false } }] },
        {
          $or: [
            { 'moderation.nextCheckAt': { $exists: false } },
            { 'moderation.nextCheckAt': { $lte: now } },
          ],
        },
        {
          $or: [
            { 'moderation.lockUntil': { $exists: false } },
            { 'moderation.lockUntil': { $lte: now } },
          ],
        },
      ],
    },
    {
      $set: {
        status: 'checking',
        'moderation.token': token,
        'moderation.lockUntil': new Date(now.getTime() + 180_000),
      },
      $inc: { 'moderation.attempts': 1 },
    },
    { sort: { createdAt: 1 }, returnDocument: 'after' }
  );
  if (!book) return false;
  const filter = { _id: book._id, status: 'checking' as const, 'moderation.token': token };
  const unlock = {
    'moderation.lockUntil': '',
    'moderation.token': '',
    'moderation.nextCheckAt': '',
  } as const;
  const [user, professional] = await Promise.all([
    findUserById(book.author),
    findProfessionalByUser(book.author),
  ]);
  if (
    !user ||
    user.role !== 'professional' ||
    (await currentStatus(user)) !== 'active' ||
    professional?.status !== 'verified'
  ) {
    await booksCollection().updateOne(filter, {
      $set: {
        status: 'unverified',
        'moderation.checkedAt': now,
        'moderation.reason':
          'A verified vet professional account is required to publish this document.',
      },
      $unset: unlock,
    });
    return true;
  }
  const pdf = Buffer.from(book.pdf.buffer);
  // Older uploads must pass the same checks and duplicate constraint as new ones.
  if (!book.contentHash) {
    try {
      await booksCollection().updateOne(filter, {
        $set: { contentHash: createHash('sha256').update(pdf).digest('hex') },
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      await booksCollection().updateOne(filter, {
        $set: {
          status: 'rejected',
          'moderation.checkedAt': now,
          'moderation.reason': 'An identical document has already been uploaded.',
        },
        $unset: unlock,
      });
      return true;
    }
  }
  const verdict = await screenBook(pdf);
  const checkedAt = new Date();
  const uncertainChecks =
    (book.moderation?.uncertainChecks ?? 0) + (verdict.outcome === 'uncertain' ? 1 : 0);
  const retry =
    verdict.outcome === 'unavailable' || (verdict.outcome === 'uncertain' && uncertainChecks < 2);
  const delay =
    verdict.outcome === 'uncertain'
      ? 15_000
      : Math.min(15 * 60_000, 60_000 * 2 ** Math.min(4, (book.moderation?.attempts ?? 1) - 1));
  await booksCollection().updateOne(filter, {
    $set: {
      status: retry
        ? 'pending'
        : verdict.outcome === 'uncertain'
        ? 'unverified'
        : verdict.outcome === 'unavailable'
        ? 'pending'
        : verdict.outcome,
      'moderation.rulesVersion': BOOK_SCREENING_RULES_VERSION,
      'moderation.model': verdict.model,
      'moderation.checkedAt': checkedAt,
      'moderation.reason': verdict.reason,
      'moderation.evidence': verdict.evidence,
      'moderation.topics': verdict.topics,
      'moderation.documentType': verdict.documentType,
      'moderation.uncertainChecks': uncertainChecks,
      ...(retry ? { 'moderation.nextCheckAt': new Date(checkedAt.getTime() + delay) } : {}),
    },
    $unset: retry ? { 'moderation.lockUntil': '', 'moderation.token': '' } : unlock,
  });
  return true;
}

export function startBookScanner(): () => void {
  let running = false;
  let stopped = false;
  const tick = async () => {
    if (running || stopped) return;
    running = true;
    try {
      await checkNextBook();
    } catch {
      // The lease expires and another tick resumes the item; it never publishes on error.
      console.error('[books] automatic checking failed; the upload remains private');
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), 15_000);
  timer.unref();
  void tick();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
