import {
  adminReviewReportListQuerySchema,
  reviewReportDecisionSchema,
  type AdminReviewReportListQuery,
  type ReviewReportDecision,
} from '@shared/schemas';
import { Router } from 'express';

import { validate, validateQuery } from '../../../middleware/validate';
import { findReviewReports, isValidObjectId, toAdminReviewReportPage } from '../../../models';
import { decideReviewReport } from '../../../services/review-reports.service';
import { fail, ok } from '../../../utils/response';
import { adminOf, ipOf } from './shared';

const router = Router();

// Said the same way by both handlers, so the queue reads one sentence.
const MISSING = 'Report not found';

// GET /api/v1/admin/reviews - the moderation queue, defaulting to the reports still waiting on a decision. The rows carry the flagged review's stars, comment and both names unmasked, because admin is a trusted surface.
router.get('/', validateQuery(adminReviewReportListQuerySchema), async (req, res) => {
  const query = req.validatedQuery as AdminReviewReportListQuery;

  const { items, total } = await findReviewReports({
    status: query.status,
    page: query.page,
    limit: query.limit,
  });

  ok(res, toAdminReviewReportPage({ items, total }, query.page, query.limit));
});

// PATCH /api/v1/admin/reviews/:id - decides one report. 'dismiss' leaves the review standing, 'remove' strips its stars and recomputes the vet's average. Both stamp an audit entry; a report already decided answers 404, so two admins cannot both close it.
router.patch('/:id', validate(reviewReportDecisionSchema), async (req, res) => {
  const admin = adminOf(req);
  const body = req.body as ReviewReportDecision;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

  const decided = await decideReviewReport({
    id: req.params.id,
    reviewer: admin,
    action: body.action,
    reason: body.reason ?? null,
    ip: ipOf(req),
  });

  if (!decided) return fail(res, 404, MISSING);

  ok(res, { id: decided._id.toHexString(), status: decided.status });
});

export default router;
