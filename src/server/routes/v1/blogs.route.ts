import {
  blogCreateSchema,
  blogListQuerySchema,
  blogUpdateSchema,
  type BlogCreate,
  type BlogListQuery,
  type BlogUpdate,
} from '@shared/schemas';
import { Router, type Request } from 'express';

import { optionalAuth } from '../../middleware/optionalAuth';
import { requireRole } from '../../middleware/requireAuth';
import { validate, validateQuery } from '../../middleware/validate';
import {
  BLOG_PUBLIC_STATUSES,
  findBlogById,
  findBlogBySlug,
  findBlogs,
  insertBlog,
  isValidObjectId,
  toBlogPage,
  toPublicBlog,
  updateBlog,
  type User,
} from '../../models';
import { AppError } from '../../utils/AppError';
import { created, fail, failReason, ok } from '../../utils/response';

const router = Router();

/** Who may write a post. Verification is what earns the professional role, so
 * the gate is the role rather than a second check here. */
const AUTHOR_ROLES = ['professional', 'admin'] as const;

/**
 * The caller as `requireRole` just read them from the database.
 *
 * Narrowing rather than asserting: the gate cannot reach a handler without
 * having set this, but the type does not know that, and a `!` would hide the day
 * somebody mounts a handler without the gate.
 */
function actorOf(req: Request): User {
  const user = req.currentUser;
  if (!user) throw AppError.unauthorized('You need to be signed in to do that.');
  return user;
}

/**
 * GET /api/v1/blogs
 *
 * The public feed: published posts only, newest first, always a page. `limit` is
 * capped by the schema and refused above it rather than quietly clamped, so
 * `?limit=100000` is a 400 and never a full collection scan.
 */
router.get('/', validateQuery(blogListQuerySchema), async (req, res) => {
  const query = req.validatedQuery as BlogListQuery;

  const { items, total } = await findBlogs({
    statuses: BLOG_PUBLIC_STATUSES,
    page: query.page,
    limit: query.limit,
    tag: query.tag,
    q: query.q,
  });

  ok(res, toBlogPage({ items, total, page: query.page, limit: query.limit }));
});

/**
 * GET /api/v1/blogs/:slug
 *
 * 404 for a draft or a taken-down post, deliberately the same answer as for a
 * slug that never existed — "this exists but you may not read it" is itself
 * something a reader has no business learning.
 */
router.get('/:slug', async (req, res) => {
  const blog = await findBlogBySlug(req.params.slug, BLOG_PUBLIC_STATUSES);
  if (!blog) return fail(res, 404, 'Post not found');

  ok(res, toPublicBlog(blog));
});

/**
 * POST /api/v1/blogs
 *
 * The author is taken from the verified token, never from the payload — the
 * schema drops an `author` field, so posting under somebody else's name is not
 * something a caller can express.
 */
router.post(
  '/',
  optionalAuth,
  requireRole(...AUTHOR_ROLES),
  validate(blogCreateSchema),
  async (req, res) => {
    const actor = actorOf(req);
    const input = req.body as BlogCreate;

    const blog = await insertBlog({ ...input, author: actor._id });

    created(res, toPublicBlog(blog));
  }
);

/**
 * PATCH /api/v1/blogs/:id
 *
 * Editing is the author's own, plus admins. `blogUpdateSchema` only accepts
 * 'draft' and 'published', so no caller — admin included — moderates through
 * this route; taking a post down is its own audited endpoint.
 */
router.patch(
  '/:id',
  optionalAuth,
  requireRole(...AUTHOR_ROLES),
  validate(blogUpdateSchema),
  async (req, res) => {
    const actor = actorOf(req);
    const patch = req.body as BlogUpdate;

    if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Post not found');

    const blog = await findBlogById(req.params.id);
    if (!blog) return fail(res, 404, 'Post not found');

    const isAdmin = actor.role === 'admin';
    if (!isAdmin && !blog.author.equals(actor._id)) {
      return failReason(res, 403, 'That post belongs to someone else.', 'not-author');
    }

    // An author cannot edit their way out of a moderation decision. Without this,
    // "hidden" is a state the author simply publishes back out of.
    if (!isAdmin && (blog.status === 'hidden' || blog.status === 'removed')) {
      return failReason(
        res,
        403,
        'This post is under review and cannot be edited.',
        'under-moderation'
      );
    }

    const updated = await updateBlog(blog._id, patch);
    if (!updated) return fail(res, 404, 'Post not found');

    ok(res, toPublicBlog(updated));
  }
);

export default router;
