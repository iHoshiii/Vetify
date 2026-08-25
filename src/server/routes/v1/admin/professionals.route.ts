import {
  adminProfessionalListQuerySchema,
  professionalRejectSchema,
  professionalVerifySchema,
  type AdminProfessionalListQuery,
  type ProfessionalReject,
  type ProfessionalVerify,
} from '@shared/schemas';
import { Router, type RequestHandler } from 'express';

import { validate, validateQuery } from '../../../middleware/validate';
import {
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

  const applicants = await applicantsOf(items);

  ok(
    res,
    toAdminProfessionalPage({ items, applicants, total, page: query.page, limit: query.limit })
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

  const applicants = await applicantsOf([application]);

  ok(res, toAdminProfessional(application, applicants.get(application.user.toString()) ?? null));
});

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

    const applicants = await applicantsOf([result.application]);

    ok(res, {
      application: toAdminProfessional(
        result.application,
        applicants.get(result.application.user.toString()) ?? null
      ),
      roleFrom: result.roleFrom,
      roleTo: result.roleTo,
    });
  };
}

/**
 * PATCH /api/v1/admin/professionals/:id/verify
 *
 * Approves the licence and, if the applicant is still a plain user, promotes
 * them. The response carries the role before and after, so the screen can say
 * what actually changed rather than assuming a promotion happened.
 */
router.patch('/:id/verify', validate(professionalVerifySchema), decision('verified'));

/**
 * PATCH /api/v1/admin/professionals/:id/reject
 *
 * Turns the application down, with a reason the applicant is shown. Not a delete:
 * the row stays, so a rejection can be reconsidered and the licence number stays
 * claimed against a second attempt.
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

export default router;
