import {
  professionalApplySchema,
  professionalListQuerySchema,
  type ProfessionalApply,
  type ProfessionalListQuery,
} from '@shared/schemas';
import { Router, type Request } from 'express';

import { optionalAuth } from '../../middleware/optionalAuth';
import { requireRole } from '../../middleware/requireAuth';
import { validate, validateQuery } from '../../middleware/validate';
import {
  findProfessionalByUser,
  findVerifiedProfessionals,
  insertProfessional,
  isDuplicateApplication,
  isDuplicateLicense,
  recordActivity,
  toOwnProfessional,
  toProfessionalPage,
  USER_ROLES,
  type User,
} from '../../models';
import { AppError } from '../../utils/AppError';
import { created, failReason, ok } from '../../utils/response';

const router = Router();

/**
 * Any signed-in account, which is what "requireAuth" means here.
 *
 * Going through `requireRole` rather than `requireAuth` buys the two things this
 * surface needs anyway: the caller is re-read from the database, so a banned
 * account cannot file an application on a token minted before the ban, and the
 * handler gets the stored user instead of a second lookup of its own.
 */
const signedIn = requireRole(...USER_ROLES);

/** The caller as the gate above just read them. */
function actorOf(req: Request): User {
  const user = req.currentUser;
  if (!user) throw AppError.unauthorized('You need to be signed in to do that.');
  return user;
}

/**
 * GET /api/v1/professionals
 *
 * The public directory: verified vets whose account is still active, newest
 * verification first. `limit` is capped by the schema and refused above the cap
 * rather than clamped, so no caller can ask for the whole collection.
 */
router.get('/', validateQuery(professionalListQuerySchema), async (req, res) => {
  const query = req.validatedQuery as ProfessionalListQuery;

  const { items, total } = await findVerifiedProfessionals({
    specialty: query.specialty,
    page: query.page,
    limit: query.limit,
  });

  ok(res, toProfessionalPage({ items, total, page: query.page, limit: query.limit }));
});

/**
 * GET /api/v1/professionals/me
 *
 * The caller's own application and where it stands. 404 when they have not
 * applied, which is what the form uses to decide whether to show itself or the
 * status of an application already in.
 *
 * Registered before nothing else that could shadow it, but kept above the
 * mutating routes so the read path stays first in the file.
 */
router.get('/me', optionalAuth, signedIn, async (req, res) => {
  const actor = actorOf(req);

  const application = await findProfessionalByUser(actor._id);
  if (!application) return failReason(res, 404, 'You have not applied yet.', 'no-application');

  ok(res, toOwnProfessional(application));
});

/**
 * POST /api/v1/professionals/apply
 *
 * One application per account, and one licence per issuing authority. Both are
 * left to the unique indexes rather than checked first: a read-then-write would
 * still let two simultaneous submissions through, and the index cannot.
 *
 * The applicant comes from the verified token. `professionalApplySchema` has no
 * `user` field, so applying on somebody else's behalf is not expressible.
 */
router.post(
  '/apply',
  optionalAuth,
  signedIn,
  validate(professionalApplySchema),
  async (req, res) => {
    const actor = actorOf(req);
    const input = req.body as ProfessionalApply;

    try {
      const application = await insertProfessional({ ...input, user: actor._id });

      // Telemetry, deliberately after the write and deliberately not awaited: the
      // applicant's response does not wait on a chart.
      recordActivity({
        type: 'professional.applied',
        user: actor._id,
        metadata: { licenseAuthority: application.licenseAuthority },
      });

      created(res, toOwnProfessional(application));
    } catch (err) {
      // Distinct reasons because the fix differs: one means "look at the
      // application you already filed", the other means "that licence is claimed,
      // talk to us".
      if (isDuplicateApplication(err)) {
        return failReason(res, 409, 'You have already applied.', 'already-applied');
      }
      if (isDuplicateLicense(err)) {
        return failReason(
          res,
          409,
          'That license is already registered with us.',
          'license-registered'
        );
      }
      throw err;
    }
  }
);

export default router;
