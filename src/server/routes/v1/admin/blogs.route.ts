import {
  adminBlogListQuerySchema,
  blogHideSchema,
  blogPurgeSchema,
  blogRemoveSchema,
  type AdminBlogListQuery,
  type BlogHideInput,
  type BlogRemoveInput,
} from '@shared/schemas';
import { Router, type RequestHandler } from 'express';
import type { Sort } from 'mongodb';

import { validate, validateQuery } from '../../../middleware/validate';
import {
  findBlogById,
  findBlogs,
  findUsersByIds,
  isValidObjectId,
  toAdminBlogDetail,
  toAdminBlogPage,
  type AdminBlogAuthor,
  type BlogDocument,
} from '../../../models';
import {
  moderateBlog,
  purgeBlog,
  type BlogModerationDecision,
} from '../../../services/blog-moderation.service';
import { fail, ok } from '../../../utils/response';
import { adminOf, ipOf } from './shared';

const router = Router();

/**
 * Worst verdict first, then last touched.
 *
 * The feed sorts by `publishedAt`, and the rows a moderator came here for — the
 * drafts, the takedowns — do not have one. `updatedAt` is the only field every
 * status shares, so it is the tie-break, and it puts the post somebody just acted
 * on at the top of everything that is not waiting on them.
 *
 * The severity in front of it is what makes this a queue rather than a list. A
 * descending sort puts missing values last, so a post the screen flagged floats
 * above the ones it passed and the ones it never saw, without a computed field or
 * a second request to find them.
 */
const MODERATION_SORT: Sort = { 'moderation.severity': -1, updatedAt: -1 };

/**
 * The authors of these posts, by id.
 *
 * One `$in` read rather than a `$lookup` inside `findBlogs`: that function also
 * serves the public feed, which has no business joining to accounts. Reads from
 * the users repository, so the password projection is the one already applied
 * there rather than a second copy of that rule.
 */
async function authorsOf(blogs: BlogDocument[]): Promise<Map<string, AdminBlogAuthor>> {
  const ids = [...new Set(blogs.map((blog) => blog.author.toString()))];
  const users = await findUsersByIds(ids);

  return new Map(
    users.map((user) => [
      user._id.toString(),
      { id: user._id.toString(), email: user.email, name: user.name },
    ])
  );
}

/**
 * GET /api/v1/admin/blogs
 *
 * Every status, which is the whole point of this list existing next to the public
 * one: a moderator cannot action what the feed hides from them. Still paginated
 * and still capped by the schema — an admin token is not a licence to scan the
 * collection.
 */
router.get('/', validateQuery(adminBlogListQuerySchema), async (req, res) => {
  const query = req.validatedQuery as AdminBlogListQuery;

  const { items, total } = await findBlogs({
    // One status when the filter asks for one, and no `statuses` at all
    // otherwise — omitting it is how the repository says "every shelf".
    statuses: query.status ? [query.status] : undefined,
    author: query.author,
    tag: query.tag,
    q: query.q,
    page: query.page,
    limit: query.limit,
    sort: MODERATION_SORT,
  });

  const authors = await authorsOf(items);

  ok(res, toAdminBlogPage({ items, authors, total, page: query.page, limit: query.limit }));
});

/**
 * GET /api/v1/admin/blogs/:id
 *
 * By id and with the body, unlike the public route: a moderator arrives from a
 * list row, and deciding whether a post breaks the rules means reading it.
 */
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Post not found');

  const blog = await findBlogById(req.params.id);
  if (!blog) return fail(res, 404, 'Post not found');

  const authors = await authorsOf([blog]);

  ok(res, toAdminBlogDetail(blog, authors.get(blog.author.toString()) ?? null));
});

/**
 * The three decisions share everything except their word and whether the reason
 * is optional, so they share a handler. Written once because the audit entry and
 * the guards are the parts that must not differ between them by accident.
 */
function decision(kind: BlogModerationDecision): RequestHandler {
  return async (req, res) => {
    const admin = adminOf(req);
    const body = req.body as Partial<BlogHideInput & BlogRemoveInput>;

    if (!isValidObjectId(req.params.id)) {
      fail(res, 404, 'Post not found');
      return;
    }

    const result = await moderateBlog({
      id: req.params.id,
      decision: kind,
      moderator: admin,
      reason: body.reason ?? null,
      ip: ipOf(req),
    });

    if (!result) {
      fail(res, 404, 'Post not found');
      return;
    }

    const authors = await authorsOf([result.blog]);

    ok(res, {
      blog: toAdminBlogDetail(result.blog, authors.get(result.blog.author.toString()) ?? null),
      statusFrom: result.statusFrom,
      statusTo: result.statusTo,
    });
  };
}

/**
 * PATCH /api/v1/admin/blogs/:id/hide
 *
 * The reversible one. A reason is welcome but not demanded — hiding is what an
 * admin reaches for while they are still deciding, and forcing a written
 * justification at that point just teaches people to type 'checking'.
 */
router.patch('/:id/hide', validate(blogHideSchema), decision('hidden'));

/**
 * PATCH /api/v1/admin/blogs/:id/remove
 *
 * The takedown, and the reason is mandatory — enforced by the schema here and
 * again in the service, because this is the record somebody will be asked to
 * justify. Still not a delete: the row stays, so the post can come back.
 */
router.patch('/:id/remove', validate(blogRemoveSchema), decision('removed'));

/**
 * PATCH /api/v1/admin/blogs/:id/restore
 *
 * Undoes either. Goes back to published if the post had ever been live, and to
 * draft if it had not, so restoring a taken-down draft does not publish it.
 */
router.patch('/:id/restore', validate(blogHideSchema), decision('restored'));

/**
 * PATCH /api/v1/admin/blogs/:id/approve
 *
 * Clears a hold the automatic screen put on, which publishes the post: being
 * flagged is what stopped it, and stopping it was the only thing the screen did.
 * A reason is optional — overruling a filter is not a decision anyone has to
 * defend, and the verdict it overruled is already on the record beside it.
 *
 * Refused with a 409 on anything not flagged, so this cannot become a way to
 * publish a draft that its author has not finished.
 */
router.patch('/:id/approve', validate(blogHideSchema), decision('approved'));

/**
 * DELETE /api/v1/admin/blogs/:id
 *
 * The end of the two-step, and the only thing in this API that destroys a post.
 * Refused with a 409 on anything not already taken down: the reversible state
 * comes first, so a mistake — the screen's or an admin's — stays recoverable until
 * somebody deliberately comes back to finish it. The reason is mandatory, and the
 * audit entry outlives the document it describes.
 */
router.delete('/:id', validate(blogPurgeSchema), async (req, res) => {
  const admin = adminOf(req);
  const body = req.body as BlogRemoveInput;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Post not found');

  const purged = await purgeBlog({
    id: req.params.id,
    moderator: admin,
    reason: body.reason,
    ip: ipOf(req),
  });

  if (!purged) return fail(res, 404, 'Post not found');

  ok(res, purged);
});

export default router;
