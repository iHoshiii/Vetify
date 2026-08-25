import type { ObjectId } from 'mongodb';

import {
  findBlogById,
  recordAudit,
  updateBlog,
  type AuditAction,
  type BlogDocument,
  type BlogPatch,
  type BlogStatus,
  type User,
} from '../models';
import { AppError } from '../utils/AppError';

/**
 * What a moderator can do to a post.
 *
 * 'hidden' is a reversible "not right now". 'removed' is a takedown that keeps the
 * row so the reason and the reviewer survive. 'restored' undoes either. Nothing
 * here deletes anything — a false positive has to be recoverable, and an
 * accountable takedown needs something left to point at.
 */
export type BlogModerationDecision = 'hidden' | 'removed' | 'restored';

const AUDIT_ACTION: Record<BlogModerationDecision, AuditAction> = {
  hidden: 'blog.hidden',
  removed: 'blog.removed',
  restored: 'blog.restored',
};

export type ModerateBlogInput = {
  id: string | ObjectId;
  decision: BlogModerationDecision;
  /** The admin acting. Their id and email are copied into the audit entry. */
  moderator: User;
  reason?: string | null;
  ip?: string | null;
};

export type ModerateBlogResult = {
  blog: BlogDocument;
  statusFrom: BlogStatus;
  statusTo: BlogStatus;
};

/**
 * Where a restore puts a post back.
 *
 * The document does not remember what it was before the takedown, and adding a
 * field to record it would be a second source of truth for something `publishedAt`
 * already answers: a post that has been live goes back live, and one that never
 * has returns to the drafts it came from. Guessing 'published' for both would
 * publish a draft that its author had not finished.
 */
function restoredStatus(blog: BlogDocument): BlogStatus {
  return blog.publishedAt ? 'published' : 'draft';
}

function nextStatus(decision: BlogModerationDecision, blog: BlogDocument): BlogStatus {
  return decision === 'restored' ? restoredStatus(blog) : decision;
}

/**
 * Applies one moderation decision: the status, the trail, and the audit entry.
 *
 * A service rather than three calls in a handler, for the same reason the
 * professional review is one: a takedown with no audit entry is precisely what the
 * audit log exists to prevent, and a status moved without its trail is a post
 * nobody can explain later. The guards below hold for every caller, not just the
 * HTTP one.
 *
 * Returns null for a post that does not exist, so the caller answers 404 rather
 * than telling a missing row apart from a failed write.
 */
export async function moderateBlog(input: ModerateBlogInput): Promise<ModerateBlogResult | null> {
  const { id, decision, moderator, reason = null, ip = null } = input;

  const current = await findBlogById(id);
  if (!current) return null;

  // The route's schema requires this too. Repeated here because the reason is the
  // entire justification for the strongest thing an admin can do to someone's
  // writing, and it must not depend on which caller arrived.
  if (decision === 'removed' && !reason?.trim()) {
    throw AppError.badRequest('A reason is required to take a post down');
  }

  if (decision === 'restored' && current.status !== 'hidden' && current.status !== 'removed') {
    throw AppError.conflict('That post is not under moderation');
  }

  const statusFrom = current.status;
  const statusTo = nextStatus(decision, current);

  if (statusFrom === statusTo) {
    throw AppError.conflict(`That post is already ${statusFrom}`);
  }

  const patch: BlogPatch = { status: statusTo };

  if (decision === 'removed') {
    patch.removedBy = moderator._id;
    patch.removedReason = reason;
    patch.removedAt = new Date();
  }

  // A restore clears the trail rather than leaving it to describe a post that is
  // no longer taken down. The record is not lost — the audit log holds every
  // takedown and every restore, which is the copy that is meant to be permanent.
  if (decision === 'restored') {
    patch.removedBy = null;
    patch.removedReason = null;
    patch.removedAt = null;
  }

  const blog = await updateBlog(current._id, patch);
  if (!blog) return null;

  await recordAudit({
    action: AUDIT_ACTION[decision],
    targetType: 'blog',
    targetId: blog._id,
    actor: moderator._id,
    actorEmail: moderator.email,
    reason,
    // Enough that the audit row explains itself without joining to a post that
    // may since have been edited, or to an account that may since be gone.
    metadata: {
      slug: blog.slug,
      title: blog.title,
      authorId: blog.author.toString(),
      statusFrom,
      statusTo,
    },
    ip,
  });

  return { blog, statusFrom, statusTo };
}
