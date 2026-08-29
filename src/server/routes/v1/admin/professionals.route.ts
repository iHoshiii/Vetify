import {
  adminProfessionalListQuerySchema,
  professionalInterviewSchema,
  professionalRejectSchema,
  professionalVerifySchema,
  type AdminProfessionalListQuery,
  type ProfessionalInterview,
  type ProfessionalReject,
  type ProfessionalVerify,
} from '@shared/schemas';
import { Router, type RequestHandler } from 'express';

import { validate, validateQuery } from '../../../middleware/validate';
import {
  findCaptureIds,
  findCaptureIdsForApplications,
  findProfessionalById,
  findProfessionals,
  findUsersByIds,
  isValidObjectId,
  toAdminProfessional,
  toAdminProfessionalPage,
  type AdminApplicant,
  type ProfessionalDocument,
} from '../../../models';
import {
  reviewProfessional,
  scheduleInterview,
  type ProfessionalDecision,
} from '../../../services/professionals.service';
import { fail, ok } from '../../../utils/response';
import { adminOf, ipOf } from './shared';

const router = Router();

/**
 * The accounts behind a page of applications, by user id.
 *
 * One `$in` read rather than a `$lookup` in `findProfessionals`, which also backs
 * the applicant's own view of their submission and has no business joining to
 * accounts. The role and status travel with the row because they are what a
 * reviewer checks against the verdict: an application from a banned account is
 * not one to approve.
 */
async function applicantsOf(
  applications: ProfessionalDocument[]
): Promise<Map<string, AdminApplicant>> {
  const ids = [...new Set(applications.map((application) => application.user.toString()))];
  const users = await findUsersByIds(ids);

  return new Map(
    users.map((user) => [
      user._id.toString(),
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name ?? null,
        // Defaulted the same way the account list does it, so an application filed
        // before the role backfill reads as a plain active user rather than as a
        // row with holes in it.
        role: user.role ?? 'user',
        status: user.status ?? 'active',
      },
    ])
  );
}

/**
 * GET /api/v1/admin/professionals
 *
 * The verification queue. `status` defaults to 'pending' in the schema, because
 * that is the only reason to open this screen; the other statuses are there for
 * looking up what was decided and, for a suspension, undoing it.
 */
router.get('/', validateQuery(adminProfessionalListQuerySchema), async (req, res) => {
  const query = req.validatedQuery as AdminProfessionalListQuery;

  const { items, total } = await findProfessionals({
    statuses: [query.status],
    q: query.q,
    page: query.page,
    limit: query.limit,
  });

  // Two `$in` reads for the page rather than two per row: the accounts behind the
  // applications, and the ids of the photographs each one carries.
  const [applicants, captures] = await Promise.all([
    applicantsOf(items),
    findCaptureIdsForApplications(items.map((application) => application._id)),
  ]);

  ok(
    res,
    toAdminProfessionalPage({
      items,
      applicants,
      captures,
      total,
      page: query.page,
      limit: query.limit,
    })
  );
});

/**
 * GET /api/v1/admin/professionals/:id
 *
 * One application in full. Same shape as a queue row — everything a reviewer
 * needs is already there, and a wider detail type would be a second place to
 * remember what an application is allowed to expose.
 */
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Application not found');

  const application = await findProfessionalById(req.params.id);
  if (!application) return fail(res, 404, 'Application not found');

  const [applicants, captures] = await Promise.all([
    applicantsOf([application]),
    findCaptureIds(application._id),
  ]);

  ok(
    res,
    toAdminProfessional(application, applicants.get(application.user.toString()) ?? null, captures)
  );
});

/**
 * One application on its way back out after a reviewer moved it.
 *
 * The captures come along for the same reason the applicant does: the screen
 * replaces the row it has with this one, and a response that left them out would
 * blank the photographs the reviewer is looking at.
 */
async function reviewed(application: ProfessionalDocument) {
  const [applicants, captures] = await Promise.all([
    applicantsOf([application]),
    findCaptureIds(application._id),
  ]);

  return toAdminProfessional(
    application,
    applicants.get(application.user.toString()) ?? null,
    captures
  );
}

/**
 * The three verdicts differ only in their word and in whether the reason is
 * owed, so they share a handler. The role change and the audit entry live in
 * `reviewProfessional`; this is the part that turns one into an HTTP answer.
 */
function decision(kind: ProfessionalDecision): RequestHandler {
  return async (req, res) => {
    const admin = adminOf(req);
    const body = req.body as Partial<ProfessionalReject & ProfessionalVerify>;

    if (!isValidObjectId(req.params.id)) {
      fail(res, 404, 'Application not found');
      return;
    }

    const result = await reviewProfessional({
      id: req.params.id,
      decision: kind,
      reviewer: admin,
      reason: body.reason ?? null,
      ip: ipOf(req),
    });

    if (!result) {
      fail(res, 404, 'Application not found');
      return;
    }

    ok(res, {
      application: await reviewed(result.application),
      roleFrom: result.roleFrom,
      roleTo: result.roleTo,
      // Whether the applicant was told, or null when the verdict owed them nothing.
      // Reported rather than swallowed for the same reason the invite reports it: the
      // decision stands either way, and a reviewer who knows the email bounced can
      // say it another way.
      mail: result.mail,
    });
  };
}

/**
 * PATCH /api/v1/admin/professionals/:id/verify
 *
 * Approves the licence, tells the applicant by email, and — if they are still a
 * plain user — promotes them. The response carries the role before and after, so the
 * screen can say what actually changed rather than assuming a promotion happened.
 */
router.patch('/:id/verify', validate(professionalVerifySchema), decision('verified'));

/**
 * PATCH /api/v1/admin/professionals/:id/reject
 *
 * Turns the application down, with a reason the applicant is shown — emailed to them
 * as well as put on their own page. That is the one place the two stages differ: a
 * declined enquiry is told only that it went no further.
 *
 * Not a delete. The row stays, so a rejection can be reconsidered and the licence
 * number stays claimed against a second attempt.
 */
router.patch('/:id/reject', validate(professionalRejectSchema), decision('rejected'));

/**
 * PATCH /api/v1/admin/professionals/:id/suspend
 *
 * Pulls a verified listing back out of the directory and drops the role with it.
 * The reversible half of a rejection, for the case where the licence was good
 * when it was checked and something has since come up.
 */
router.patch('/:id/suspend', validate(professionalRejectSchema), decision('suspended'));

/**
 * PATCH /api/v1/admin/professionals/:id/interview
 *
 * Books the conversation the applicant is waiting on and emails them the time.
 * Not a verdict and not recorded as one — `reviewedBy` and `reviewedAt` are the
 * trail behind a decision, and an application still being talked about has not
 * been decided.
 *
 * Bookable from 'rejected' too: an appeal that gets a hearing is exactly this
 * move, and taking it clears the refusal reason, which no longer describes where
 * the application stands.
 */
router.patch('/:id/interview', validate(professionalInterviewSchema), async (req, res) => {
  const admin = adminOf(req);
  const body = req.body as ProfessionalInterview;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Application not found');

  const result = await scheduleInterview({
    id: req.params.id,
    reviewer: admin,
    at: new Date(body.interviewAt),
    note: body.note ?? null,
    ip: ipOf(req),
  });

  if (!result) return fail(res, 404, 'Application not found');

  ok(res, {
    application: await reviewed(result.application),
    // The booking stands whether or not the message went out, so the screen is
    // told which happened and can offer to say it another way.
    delivered: result.delivered,
    deliveryError: result.deliveryError,
  });
});

export default router;
