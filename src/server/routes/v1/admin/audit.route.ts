import { adminAuditListQuerySchema, type AdminAuditListQuery } from '@shared/schemas';
import { Router } from 'express';

import { validateQuery } from '../../../middleware/validate';
import { findAuditEntries, toAuditPage } from '../../../models';
import { ok } from '../../../utils/response';

const router = Router();

/**
 * GET /api/v1/admin/audit
 *
 * The trail: every privileged action, newest first, filterable by who did it,
 * what they did, and what they did it to.
 *
 * Read-only by design and by omission — there is no route here that writes,
 * edits or deletes an entry. `recordAudit` is the only way a row appears, and
 * nothing at all removes one, which is what makes the answer to "who took this
 * post down" worth trusting.
 */
router.get('/', validateQuery(adminAuditListQuerySchema), async (req, res) => {
  const query = req.validatedQuery as AdminAuditListQuery;

  const { items, total } = await findAuditEntries({
    action: query.action,
    targetType: query.targetType,
    targetId: query.targetId,
    actor: query.actor,
    page: query.page,
    limit: query.limit,
  });

  ok(res, toAuditPage({ items, total, page: query.page, limit: query.limit }));
});

export default router;
