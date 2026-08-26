import {
  BLOG_STATUSES,
  type BlogStatus,
  type ModerationCategory,
  type ModerationOutcome,
} from '@shared/schemas';
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

/**
 * The automatic screen's verdict on a post, as the document holds it.
 *
 * Written whenever a post is about to become publicly readable, and left alone
 * afterwards: it is a record of what the check saw at that moment, not a live
 * opinion. `reviewedBy` and `reviewedAt` stay null until a human either clears the
 * post or upholds the hold, which is what makes "screened but nobody has looked"
 * distinguishable from "screened and decided".
 *
 * Null on a post that has never been screened — every draft, and every post that
 * predates the screen. Unscreened is deliberately not flagged: those posts were
 * published under the rules that existed then, and a backfill that swept them all
 * into the queue would bury the posts that actually need a decision.
 */
export type BlogModeration = {
  outcome: ModerationOutcome;
  categories: ModerationCategory[];
  /** 0 to 1, worst category wins. This is what orders the review queue. */
  severity: number;
  /** The literal terms a wordlist matched, so a reviewer sees the trigger. */
  terms: string[];
  notes: string | null;
  /** Which model answered, or null when the verdict came from the wordlist alone. */
  model: string | null;
  checkedAt: Date;
  reviewedBy: ObjectId | null;
  reviewedAt: Date | null;
};

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
  /** The automatic screen's verdict, or null on a post it never looked at. */
  moderation: BlogModeration | null;
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

/** The author as the dashboard needs them: enough to recognise an account and
 * enough to write to it. Assembled by the route, so this file stays clear of the
 * user model. */
export type AdminBlogAuthor = {
  id: string;
  email: string;
  name: string | null;
};

/**
 * One post as the dashboard sees it: the reader's summary, the moderation trail,
 * and who wrote it.
 *
 * The trail is included here and nowhere public. A takedown decision is made from
 * exactly this — the status, the previous reason, and the account behind the post.
 * `author` is null when the account has since been deleted, which is a real state
 * and not an error: the post outlives the account.
 */
/** The verdict as the dashboard reads it: dates and ids as strings, like every
 * other shape a route answers with. */
export type AdminBlogModeration = Omit<
  BlogModeration,
  'checkedAt' | 'reviewedBy' | 'reviewedAt'
> & {
  checkedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export type AdminBlogSummary = BlogSummary & {
  author: AdminBlogAuthor | null;
  removedBy: string | null;
  removedReason: string | null;
  removedAt: string | null;
  /**
   * Why this row is in the queue, and how badly. Included here and nowhere public:
   * telling an author which term tripped the filter is a lesson in getting the
   * next one through.
   */
  moderation: AdminBlogModeration | null;
};

/** The same, with the body, for the review screen. Nobody can judge a post they
 * cannot read. */
export type AdminBlogDetail = AdminBlogSummary & { body: string };

export type AdminBlogPage = {
  items: AdminBlogSummary[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};
