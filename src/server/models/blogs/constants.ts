import type { IndexDescription } from 'mongodb';

export const BLOGS_COLLECTION = 'blogs';

/**
 * Named explicitly because Mongo rewrites a text index's key to its internal
 * `{ _fts, _ftsx }` form, so the generated name would not describe it and
 * nothing could look it up by key afterwards.
 */
export const BLOG_SEARCH_INDEX = 'blog_search';

export const BLOG_INDEXES: IndexDescription[] = [
  // The slug is the post's public identity, so uniqueness is enforced by the
  // database rather than by a read-then-write in the repository.
  { key: { slug: 1 }, unique: true },
  // The public feed: published only, newest first.
  { key: { status: 1, publishedAt: -1 } },
  // An author's own posts, and the admin view of one person's output.
  { key: { author: 1, createdAt: -1 } },
  // The moderation list, which sorts by what was touched last rather than by
  // what is live: a draft and a takedown both have to appear in it, and neither
  // has a publishedAt to order by.
  { key: { updatedAt: -1 } },
  // Admin search. Only one text index is allowed per collection, so all three
  // searchable fields share it; the weights decide which match ranks higher.
  {
    key: { title: 'text', excerpt: 'text', tags: 'text' },
    name: BLOG_SEARCH_INDEX,
    weights: { title: 10, tags: 5, excerpt: 1 },
  },
];
