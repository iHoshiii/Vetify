import { BLOG_PAGE_SIZE } from '@shared/limits';
import { ObjectId, type Collection, type Filter, type Sort } from 'mongodb';

import { getDb } from '../../config/db';
import { dailyCountStages, type DailyCount } from '../daily-count';
import { toObjectId } from '../object-id';
import { BLOGS_COLLECTION } from './constants';
import { blogAttrsSchema, type BlogAttrs } from './schema';
import { slugify } from './slug';
import type { BlogDocument, BlogStatus } from './types';

/** Newest published first — exactly the `{ status: 1, publishedAt: -1 }` index. */
const FEED_SORT: Sort = { publishedAt: -1 };

/**
 * How many `-2`, `-3` suffixes to try before giving up. Reached only when the
 * same title has been posted this many times, or when a run of unsluggable
 * titles all landed on the same fallback.
 */
const SLUG_ATTEMPTS = 25;

// get the blogs collection reference from the database connection
export function blogsCollection(): Collection<BlogDocument> {
  return getDb().collection<BlogDocument>(BLOGS_COLLECTION);
}

/**
 * A duplicate-key error that names the slug index specifically. Any other
 * duplicate is somebody else's problem and gets rethrown — swallowing it here
 * would turn an unrelated conflict into a mystery slug.
 */
function isSlugTaken(err: unknown): boolean {
  const detail = err as { code?: number; keyPattern?: Record<string, unknown> } | null;
  return detail?.code === 11000 && detail.keyPattern?.slug !== undefined;
}

/**
 * Creates a post, letting the unique index settle slug collisions.
 *
 * Checking first and inserting second would still race two authors posting the
 * same title in the same moment. Inserting and reacting to the index cannot: the
 * database is the one deciding, so the loser simply tries the next suffix.
 */
export async function insertBlog(attrs: BlogAttrs): Promise<BlogDocument> {
  const parsed = blogAttrsSchema.parse(attrs);
  const now = new Date();
  const base = slugify(parsed.slug ?? parsed.title);

  for (let attempt = 1; attempt <= SLUG_ATTEMPTS; attempt++) {
    const doc: BlogDocument = {
      _id: new ObjectId(),
      title: parsed.title,
      slug: attempt === 1 ? base : `${base}-${attempt}`,
      excerpt: parsed.excerpt,
      body: parsed.body,
      coverUrl: parsed.coverUrl ?? null,
      tags: parsed.tags ?? [],
      author: toObjectId(parsed.author),
      status: parsed.status,
      removedBy: null,
      removedReason: null,
      removedAt: null,
      // A post created straight into 'published' is live now; a draft has no
      // publication date until somebody publishes it.
      publishedAt: parsed.status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await blogsCollection().insertOne(doc);
      return doc;
    } catch (err) {
      if (!isSlugTaken(err)) throw err;
    }
  }

  throw new Error(`Could not find a free slug for '${base}' after ${SLUG_ATTEMPTS} attempts`);
}

// find a single post by its MongoDB ObjectId or string id
export async function findBlogById(id: string | ObjectId): Promise<BlogDocument | null> {
  return await blogsCollection().findOne({ _id: toObjectId(id) });
}

/**
 * Find a post by its URL. `statuses` is how a caller says which shelf it is
 * allowed to look on: the public route passes the published one, so a draft or a
 * removed post reads as a 404 rather than leaking through a guessed slug.
 */
export async function findBlogBySlug(
  slug: string,
  statuses?: BlogStatus[]
): Promise<BlogDocument | null> {
  const filter: Filter<BlogDocument> = { slug };
  if (statuses?.length) filter.status = { $in: statuses };
  return await blogsCollection().findOne(filter);
}

export type FindBlogsOptions = {
  /**
   * Restricts the read to these statuses. Omitting it means every status, which
   * is an admin-only view — public callers always pass their own list.
   */
  statuses?: BlogStatus[];
  author?: string | ObjectId;
  tag?: string;
  /** Full-text search across title, excerpt and tags. */
  q?: string;
  page?: number;
  limit?: number;
  sort?: Sort;
};

/**
 * One page of posts and the total behind it.
 *
 * Always paginated, with no unbounded overload: `find({})` on a collection that
 * only grows is a slow query waiting for the day it matters.
 */
export async function findBlogs(
  options: FindBlogsOptions = {}
): Promise<{ items: BlogDocument[]; total: number }> {
  const { statuses, author, tag, q, page = 1, limit = BLOG_PAGE_SIZE, sort = FEED_SORT } = options;

  const filter: Filter<BlogDocument> = {};
  if (statuses?.length) filter.status = { $in: statuses };
  if (author) filter.author = toObjectId(author);
  // Tags are stored lowercase, so an equality match against an array element is
  // all this needs — no $elemMatch, no regex.
  if (tag) filter.tags = tag;
  if (q) filter.$text = { $search: q };

  // A search orders by relevance instead of by date, which is the only reason
  // anyone types a query rather than scrolling the feed.
  const cursor = q
    ? blogsCollection()
        .find(filter, { projection: { score: { $meta: 'textScore' } } })
        .sort({ score: { $meta: 'textScore' } })
    : blogsCollection().find(filter).sort(sort);

  const [items, total] = await Promise.all([
    cursor
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    blogsCollection().countDocuments(filter),
  ]);

  return { items, total };
}

/**
 * The fields a post can be moved to after it exists. The slug is not among them:
 * it is the address people have already shared.
 */
export type BlogPatch = Partial<
  Pick<
    BlogDocument,
    | 'title'
    | 'excerpt'
    | 'body'
    | 'coverUrl'
    | 'tags'
    | 'status'
    | 'removedBy'
    | 'removedReason'
    | 'removedAt'
  >
>;

/**
 * Applies a patch and returns the post as it now stands.
 *
 * The first publication stamps `publishedAt` and nothing later moves it, so
 * correcting a typo on a two-month-old post does not shove it back to the top of
 * the feed.
 */
export async function updateBlog(
  id: string | ObjectId,
  patch: BlogPatch
): Promise<BlogDocument | null> {
  const _id = toObjectId(id);
  if (Object.keys(patch).length === 0) return await findBlogById(_id);

  const set: Partial<BlogDocument> = { ...patch, updatedAt: new Date() };

  if (patch.status === 'published') {
    const current = await findBlogById(_id);
    if (!current) return null;
    if (!current.publishedAt) set.publishedAt = new Date();
  }

  return await blogsCollection().findOneAndUpdate(
    { _id },
    { $set: set },
    { returnDocument: 'after' }
  );
}

/**
 * How many posts sit in each status. Feeds the admin breakdown chart, and the
 * status index keeps it cheap enough to run per request.
 */
export async function countBlogsByStatus(): Promise<Record<string, number>> {
  const rows = await blogsCollection()
    .aggregate<{ _id: BlogStatus; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray();

  return Object.fromEntries(rows.map((row) => [row._id, row.count]));
}
/**
 * Posts written in a half-open window, [from, to).
 *
 * On `createdAt`, not `publishedAt`: a draft is writing that happened, and it has
 * no publish date to be counted by. Bucketing on `publishedAt` would also make
 * the line rewrite itself retroactively every time an old draft goes live.
 *
 * Unlike the four series read from activity events, this one survives the
 * retention window — the post is still here long after any event about it would
 * have expired.
 */
export function countBlogsBetween(input: { from: Date; to: Date }): Promise<number> {
  return blogsCollection().countDocuments({ createdAt: { $gte: input.from, $lt: input.to } });
}

/** One row per day of posts written, oldest first, since `from`. */
export function countBlogsPerDay(input: { from: Date }): Promise<DailyCount[]> {
  return blogsCollection()
    .aggregate<DailyCount>([
      { $match: { createdAt: { $gte: input.from } } },
      ...dailyCountStages('createdAt'),
    ])
    .toArray();
}
