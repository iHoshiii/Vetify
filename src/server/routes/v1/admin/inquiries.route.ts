import {
  adminInquiryListQuerySchema,
  professionalDeclineSchema,
  professionalInviteSchema,
  type AdminInquiryListQuery,
  type ProfessionalDecline,
  type ProfessionalInvite,
} from '@shared/schemas';
import { Router } from 'express';

import { validate, validateQuery } from '../../../middleware/validate';
import {
  findProfessionalInquiries,
  findProfessionalInquiryById,
  isValidObjectId,
  toAdminInquiry,
  toAdminInquiryPage,
} from '../../../models';
import { declineInquiry, inviteInquiry } from '../../../services/professional-inquiries.service';
import { fail, ok } from '../../../utils/response';
import { adminOf, ipOf } from './shared';

const router = Router();

/** Said the same way by every handler here, so the queue reads one sentence. */
const MISSING = 'Enquiry not found';

/**
 * GET /api/v1/admin/inquiries
 *
 * The queue a reviewer actually starts on: an application does not exist until
 * somebody has been invited to file one. Defaults to 'pending', which is the only
 * status anybody is waiting on; the rest are for looking up what was decided.
 */
router.get('/', validateQuery(adminInquiryListQuerySchema), async (req, res) => {
  const query = req.validatedQuery as AdminInquiryListQuery;

  const { items, total } = await findProfessionalInquiries({
    statuses: [query.status],
    q: query.q,
    page: query.page,
    limit: query.limit,
  });

  ok(res, toAdminInquiryPage({ items, total, page: query.page, limit: query.limit }));
});

/**
 * GET /api/v1/admin/inquiries/:id
 *
 * One enquiry in full. Same shape as a queue row: the motivation is the whole
 * basis for the decision and is already in the list, so a wider detail type would
 * be a second place to remember what an enquiry exposes.
 */
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

  const inquiry = await findProfessionalInquiryById(req.params.id);
  if (!inquiry) return fail(res, 404, MISSING);

  ok(res, toAdminInquiry(inquiry));
});

/**
 * PATCH /api/v1/admin/inquiries/:id/invite
 *
 * Yes: mints a link, emails it, and moves the row. Called again on the same
 * enquiry it resends — a new link, the old one dead, which is the behaviour you
 * want when the reason for resending is that the first went astray.
 *
 * The raw link comes back with the enquiry because this response is the only place
 * besides the inbox it exists. `delivered: false` is not a failure of the
 * decision — the row moved either way — so the screen shows the link and lets the
 * reviewer pass it on by hand.
 */
router.patch('/:id/invite', validate(professionalInviteSchema), async (req, res) => {
  const admin = adminOf(req);
  const body = req.body as ProfessionalInvite;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

  const result = await inviteInquiry({
    id: req.params.id,
    reviewer: admin,
    note: body.note ?? null,
    ip: ipOf(req),
  });

  if (!result) return fail(res, 404, MISSING);

  ok(res, {
    inquiry: toAdminInquiry(result.inquiry),
    link: result.link,
    delivered: result.delivered,
    deliveryError: result.deliveryError,
  });
});

/**
 * PATCH /api/v1/admin/inquiries/:id/decline
 *
 * No, with a reason — written for the audit log and for whoever reads the queue
 * next, not for the applicant: the email says only that the enquiry was not taken
 * further. Not a delete, because the same person may write in again and the
 * previous answer is context.
 */
router.patch('/:id/decline', validate(professionalDeclineSchema), async (req, res) => {
  const admin = adminOf(req);
  const body = req.body as ProfessionalDecline;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

  const result = await declineInquiry({
    id: req.params.id,
    reviewer: admin,
    reason: body.reason,
    ip: ipOf(req),
  });

  if (!result) return fail(res, 404, MISSING);

  ok(res, {
    inquiry: toAdminInquiry(result.inquiry),
    delivered: result.delivered,
    deliveryError: result.deliveryError,
  });
});

export default router;
