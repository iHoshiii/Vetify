import { BLOG_STATUSES, type BlogStatus } from '@shared/schemas';
import { ObjectId } from 'mongodb';

/**
 * Where a post sits.
 *
 * 'draft' and 'published' are the author's to set. 'hidden' and 'removed' are
 * moderation outcomes: hidden is a reversible "not right now", removed is a
 * takedown that keeps the row so the reason and the reviewer survive. Nothing
 * calls deleteOne on a post — a false positive has to be restorable, and an
 * accountable takedown needs something left to point at.
 */
export { BLOG_STATUSES };
export type { BlogStatus };

/** The statuses a reader may see. Every public read filters on exactly this. */
export const BLOG_PUBLIC_STATUSES: BlogStatus[] = ['published'];

// blog document/info stored in the database
export type BlogDocument = {
  _id: ObjectId;
  title: string;
  /**
   * The URL the post is reachable at. Minted once from the title and never
   * rewritten afterwards, because every link anyone has shared points at it.
   */
  slug: string;
  excerpt: string;
  body: string;
  coverUrl: string | null;
  tags: string[];
  author: ObjectId;
  status: BlogStatus;
  // Moderation trail, written by the admin takedown route. Null on a post that
  // has never been actioned.
  removedBy: ObjectId | null;
  removedReason: string | null;
  removedAt: Date | null;
  /**
   * When it first went live, not when it last changed. Fixing a typo on a
   * published post should not push it back to the top of the feed.
   */
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * One post as a reader receives it.
 *
 * Dates are ISO strings rather than Dates: that is what JSON.stringify produces
 * anyway, and typing them as Date here would describe the server's object
 * instead of the response the client actually parses.
 *
 * The moderation trail is deliberately absent. Who removed a post and why is
 * internal — the admin surface reads it from the document directly.
 */
export type PublicBlog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverUrl: string | null;
  tags: string[];
  authorId: string;
  status: BlogStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** List form. Drops the body — a page of nine full posts is mostly text nobody
 * on that screen is going to read. */
export type BlogSummary = Omit<PublicBlog, 'body'>;

/** One page of results, plus what the client needs to draw a pager. */
export type BlogPage = {
  items: BlogSummary[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};
