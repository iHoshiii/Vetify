import {
  professionalApplySchema,
  professionalInquirySchema,
  professionalListQuerySchema,
  type ProfessionalApply,
  type ProfessionalInquiry,
  type ProfessionalInviteRefusal,
  type ProfessionalListQuery,
} from '@shared/schemas';
import { Router, type Request, type Response } from 'express';

import { optionalAuth } from '../../middleware/optionalAuth';
import { requireRole } from '../../middleware/requireAuth';
import { inquiryLimiter } from '../../middleware/security';
import { validate, validateQuery } from '../../middleware/validate';
import {
  deleteProfessional,
  deleteProfessionalCaptures,
  findCaptureIds,
  findProfessionalByUser,
  findProfessionalCapture,
  findVerifiedProfessionals,
  insertProfessional,
  insertProfessionalCaptures,
  insertProfessionalInquiry,
  isDuplicateApplication,
  isDuplicateInquiry,
  isDuplicateLicense,
  isValidObjectId,
  recordActivity,
  toInviteSummary,
  toOwnProfessional,
  toProfessionalPage,
  USER_ROLES,
  type ProfessionalCaptureIds,
  type User,
} from '../../models';
import { completeInquiry, readInvite } from '../../services/professional-inquiries.service';
import { AppError } from '../../utils/AppError';
import { created, fail, failReason, ok } from '../../utils/response';

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

const INVITE_TOKEN = /^[0-9a-f]{64}$/i;

/**
 * The invitation token from the path, or null when the path had nothing usable.
 *
 * `mintInvite` writes 32 random bytes as hex, so anything of another shape was
 * never a link we sent, and refusing it here keeps a crawler walking the URL space
 * off the collection entirely. The `string[]` case is Express being honest about
 * repeated segments; this route has exactly one.
 */
function tokenOf(req: Request): string | null {
  const token = req.params.token;
  return typeof token === 'string' && INVITE_TOKEN.test(token) ? token : null;
}

/**
 * How each refusal reads on the wire.
 *
 * 404 only for a link that was never ours; the other three are 410, because the
 * link existed and no longer works — a distinction the form uses to decide
 * between "check the address" and "ask us for another one". The reason travels
 * alongside the sentence so the page can render its own copy without parsing
 * prose.
 */
const REFUSALS: Record<ProfessionalInviteRefusal, { status: number; error: string }> = {
  'not-found': { status: 404, error: 'That application link is not one of ours.' },
  withdrawn: { status: 410, error: 'That invitation was withdrawn. Please get in touch with us.' },
  used: { status: 410, error: 'That link has already been used to file an application.' },
  expired: { status: 410, error: 'That link has expired. Ask us for a new one.' },
};

function refuseInvite(res: Response, reason: ProfessionalInviteRefusal): Response {
  const refusal = REFUSALS[reason];
  return failReason(res, refusal.status, refusal.error, reason);
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
 * The capture ids come along so the dashboard can show the applicant what they
 * submitted. Ids and not bytes: three photographs would make this the heaviest
 * read on the account, and the screen wants them one <img> at a time anyway.
 */
router.get('/me', optionalAuth, signedIn, async (req, res) => {
  const actor = actorOf(req);

  const application = await findProfessionalByUser(actor._id);
  if (!application) return failReason(res, 404, 'You have not applied yet.', 'no-application');

  const captures = await findCaptureIds(application._id);
  ok(res, toOwnProfessional(application, captures));
});

/**
 * POST /api/v1/professionals/inquiries
 *
 * Stage one: the short form that opens a review. A reviewer reads it and either
 * emails an application link or turns it down.
 *
 * An account is required, even though nothing here is checked against it. Stage
 * two matches the invited address against whoever opens the link, so an enquiry
 * from nobody in particular could only ever earn a link its sender cannot use.
 *
 * The guards sit ahead of the limiter so a stranger cannot spend the hourly
 * allowance of the accounts sharing its address. `generalLimiter` on /api is what
 * holds the refusals themselves.
 *
 * "One open enquiry per address" is left to the partial unique index rather than a
 * read-then-write, which two simultaneous submissions would walk straight through.
 * A declined or completed enquiry has its `openEmail` nulled, so writing in again
 * later is allowed — this only stops the same person filling the queue while their
 * first enquiry is still waiting.
 */
router.post(
  '/inquiries',
  optionalAuth,
  signedIn,
  inquiryLimiter,
  validate(professionalInquirySchema),
  async (req, res) => {
    const input = req.body as ProfessionalInquiry;

    try {
      await insertProfessionalInquiry(input);
    } catch (err) {
      if (isDuplicateInquiry(err)) {
        return failReason(
          res,
          409,
          'We already have an enquiry from that address. Watch your inbox — we will be in touch.',
          'inquiry-open'
        );
      }
      throw err;
    }

    // Nothing of the row goes back. No endpoint reads an enquiry but the
    // reviewer's, and the row is not tied to the account that sent it, so an id
    // here would be a handle to something its holder can never open.
    created(res, { received: true });
  }
);

/**
 * GET /api/v1/professionals/invites/:token
 *
 * What the emailed link opens: enough of the enquiry to fill the application form
 * in, and when the link stops working. Deliberately readable without signing in —
 * the page has to be able to say "this link is for maria@example.com, sign in as
 * her" before it knows who is looking.
 *
 * The token is the whole credential, so the summary stays thin: the name, licence
 * and locations the applicant themselves typed, and no motivation, reviewer note
 * or status history.
 */
router.get('/invites/:token', async (req, res) => {
  const token = tokenOf(req);
  if (!token) return refuseInvite(res, 'not-found');

  const lookup = await readInvite(token);
  if (!lookup.ok) return refuseInvite(res, lookup.reason);

  ok(res, toInviteSummary(lookup.inquiry));
});

/**
 * POST /api/v1/professionals/invites/:token/apply
 *
 * Stage two: the long form, reachable only through a link a reviewer sent. Two
 * credentials are needed and neither substitutes for the other — the token proves
 * the enquiry was invited, and the session proves who is filing it, because the
 * application has to hang off an account that can sign in and read its own status
 * afterwards.
 *
 * The address has to match the one the invitation went to. Without that check a
 * forwarded link would let anybody at all file against somebody else's reviewed
 * enquiry, which is precisely the review the two stages exist to preserve.
 *
 * One application per account and one licence per issuing authority are left to
 * the unique indexes: a read-then-write would still let two simultaneous
 * submissions through, and the index cannot.
 *
 * `validate` runs ahead of all of this, being middleware, so a payload that is
 * malformed as well as unauthorised is answered as malformed. Left that way: the
 * body parser has already read the request by then, so checking the token first
 * would save nothing, and both answers are true.
 */
router.post(
  '/invites/:token/apply',
  optionalAuth,
  signedIn,
  validate(professionalApplySchema),
  async (req, res) => {
    const actor = actorOf(req);

    const token = tokenOf(req);
    if (!token) return refuseInvite(res, 'not-found');

    const lookup = await readInvite(token);
    if (!lookup.ok) return refuseInvite(res, lookup.reason);
    const inquiry = lookup.inquiry;

    if (actor.email.trim().toLowerCase() !== inquiry.email) {
      return failReason(
        res,
        403,
        `This link was sent to ${inquiry.email}. Sign in with that address to continue.`,
        'invite-email-mismatch'
      );
    }

    // The photographs are split off here rather than in the repository: the
    // application row and the three JPEGs live in different collections, and
    // `professionalAttrsSchema` has no field to put them in.
    const { portrait, licenseFront, licenseBack, ...attrs } = req.body as ProfessionalApply;

    let application;
    try {
      application = await insertProfessional({ ...attrs, user: actor._id });
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

    const captures: ProfessionalCaptureIds = {};
    try {
      const written = await insertProfessionalCaptures({
        application: application._id,
        user: actor._id,
        captures: [
          { kind: 'portrait', ...portrait },
          { kind: 'licenseFront', ...licenseFront },
          { kind: 'licenseBack', ...licenseBack },
        ],
      });

      for (const capture of written) captures[capture.kind] = capture._id.toString();
    } catch (err) {
      // Unwound rather than left half-filed. An application with no photographs is
      // one a reviewer cannot act on, and leaving it would hold both unique slots —
      // this account's one application, this licence number — against a write that
      // did not finish. The invitation is untouched, so the same link still works
      // on the retry.
      await deleteProfessionalCaptures(application._id);
      await deleteProfessional(application._id);
      throw err;
    }

    // Last, and only now: the enquiry is spent on an application that exists whole.
    // A failure before this point leaves a live link; a failure after it leaves an
    // application a reviewer can still see, which is the harmless direction.
    await completeInquiry(inquiry._id, application._id);

    // Telemetry, deliberately not awaited: the applicant's response does not wait
    // on a chart.
    recordActivity({
      type: 'professional.applied',
      user: actor._id,
      metadata: { licenseAuthority: application.licenseAuthority },
    });

    created(res, toOwnProfessional(application, captures));
  }
);

/**
 * GET /api/v1/professionals/captures/:id
 *
 * One photograph, streamed to the person in it or to a reviewer. The only route
 * that carries image bytes, and the reason the captures live in their own
 * collection: everything else about an application can be listed a page at a time
 * without moving megabytes.
 *
 * A caller who is neither gets a 404 rather than a 403. These are identity
 * documents, and a 403 would confirm that the id names a real one.
 */
router.get('/captures/:id', optionalAuth, signedIn, async (req, res) => {
  const actor = actorOf(req);
  const missing = () => fail(res, 404, 'That photograph does not exist.');

  if (!isValidObjectId(req.params.id)) return missing();

  const capture = await findProfessionalCapture(req.params.id);
  if (!capture) return missing();

  const isOwner = capture.user.equals(actor._id);
  if (!isOwner && actor.role !== 'admin') return missing();

  res.setHeader('Content-Type', capture.mimeType);
  res.setHeader('Content-Length', String(capture.byteLength));
  // Private, and not written down. A licence card in a shared machine's disk cache
  // outlives the session that fetched it, and no proxy in between has any business
  // holding a copy.
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', 'inline');

  res.end(Buffer.from(capture.bytes.buffer));
});

export default router;
