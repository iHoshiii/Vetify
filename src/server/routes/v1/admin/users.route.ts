import {
  adminUserListQuerySchema,
  userRoleUpdateSchema,
  userStatusUpdateSchema,
  type AdminUserListQuery,
  type UserRoleUpdateInput,
  type UserStatusUpdateInput,
} from '@shared/schemas';
import { Router } from 'express';

import { validate, validateQuery } from '../../../middleware/validate';
import {
  findUserById,
  findUsersPaginated,
  isValidObjectId,
  toAdminUser,
  toAdminUserPage,
} from '../../../models';
import { changeUserRole, changeUserStatus } from '../../../services/user-moderation.service';
import { fail, ok } from '../../../utils/response';
import { adminOf, ipOf } from './shared';

const router = Router();

/**
 * GET /api/v1/admin/users
 *
 * The account list: filterable by role, status and provider, searchable, and
 * always one capped page. This is the only read in the app that returns other
 * people's accounts, so it goes through `findUsersPaginated` — which projects the
 * password away and refuses to answer without a page — rather than a find here.
 */
router.get('/', validateQuery(adminUserListQuerySchema), async (req, res) => {
  const query = req.validatedQuery as AdminUserListQuery;

  const { items, total } = await findUsersPaginated({
    q: query.q,
    role: query.role,
    status: query.status,
    provider: query.provider,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
    days: query.days,
  });

  ok(res, toAdminUserPage({ items, total, page: query.page, limit: query.limit }));
});

/**
 * GET /api/v1/admin/users/:id
 *
 * One account in full, which is the same shape as a list row — there is nothing
 * extra worth showing, and inventing a wider detail type would only be a second
 * place to remember not to return the password.
 */
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Account not found');

  const user = await findUserById(req.params.id);
  if (!user) return fail(res, 404, 'Account not found');

  ok(res, toAdminUser(user));
});

/**
 * PATCH /api/v1/admin/users/:id/role
 *
 * Promotion and demotion. Granting 'professional' here does not create an
 * application — the verification queue is the path that does both — so this is
 * the manual override, recorded as one.
 */
router.patch('/:id/role', validate(userRoleUpdateSchema), async (req, res) => {
  const admin = adminOf(req);
  const body = req.body as UserRoleUpdateInput;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Account not found');

  const result = await changeUserRole({
    id: req.params.id,
    moderator: admin,
    to: body.role,
    reason: body.reason ?? null,
    ip: ipOf(req),
  });

  if (!result) return fail(res, 404, 'Account not found');

  ok(res, { user: toAdminUser(result.user), roleFrom: result.from, roleTo: result.to });
});

/**
 * PATCH /api/v1/admin/users/:id/status
 *
 * Suspend, ban, or reinstate. The response reports how many sessions the change
 * closed, because "banned" and "banned and logged out everywhere" are different
 * outcomes and the admin who pressed the button is the one who should know which
 * they got.
 */
router.patch('/:id/status', validate(userStatusUpdateSchema), async (req, res) => {
  const admin = adminOf(req);
  const body = req.body as UserStatusUpdateInput;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Account not found');

  const result = await changeUserStatus({
    id: req.params.id,
    moderator: admin,
    to: body.status,
    reason: body.reason ?? null,
    ip: ipOf(req),
  });

  if (!result) return fail(res, 404, 'Account not found');

  ok(res, {
    user: toAdminUser(result.user),
    statusFrom: result.from,
    statusTo: result.to,
    sessionsRevoked: result.sessionsRevoked,
  });
});

export default router;
