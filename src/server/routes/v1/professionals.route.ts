import { calculateMaxRecommendedRate } from '@shared/limits';
import {
  appointmentSlotsQuerySchema,
  professionalApplySchema,
  professionalInquirySchema,
  professionalListQuerySchema,
  professionalMapUpdateSchema,
  professionalNearQuerySchema,
  professionalProfileUpdateSchema,
  type AppointmentSlotsQuery,
  type ProfessionalApply,
  type ProfessionalInquiry,
  type ProfessionalInviteRefusal,
  type ProfessionalListQuery,
  type ProfessionalMapUpdate,
  type ProfessionalNearQuery,
  type ProfessionalProfileUpdate,
} from '@shared/schemas';
import { APPOINTMENT_SLOT_MINUTES } from '@shared/limits';
import { Router, type Request, type Response } from 'express';

import { optionalAuth } from '../../middleware/optionalAuth';
import { inquiryLimiter } from '../../middleware/security';
import { validate, validateQuery } from '../../middleware/validate';
import {
  deleteProfessional,
  deleteProfessionalCaptures,
  findCaptureIds,
  findProfessionalById,
  findProfessionalByUser,
  findProfessionalCapture,
  findProfessionalsNear,
  findVerifiedProfessionals,
  findHeldSlots,
  findUserById,
  insertProfessional,
  insertProfessionalCaptures,
  isDuplicateApplication,
  isDuplicateInquiry,
  isDuplicateLicense,
  isValidObjectId,
  recordActivity,
  toInviteSummary,
  toNearbyProfessional,
  toOwnProfessional,
  toProfessionalPage,
  toPublicProfessional,
  updateAddressMap,
  updateProfessionalProfile,
  type ProfessionalCaptureIds,
  type ProfessionalProfilePatch,
} from '../../models';
import {
  completeInquiry,
  readInvite,
  submitInquiry,
} from '../../services/professional-inquiries.service';
import { created, fail, failReason, ok } from '../../utils/response';
import { slotRangeBounds, slotsForRange } from '../../services/appointment-slots';
import { actorOf, signedIn } from './caller';

const router = Router();

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
    q: query.q,
    minExperience: query.minExperience,
    maxRate: query.maxRate,
    available: query.available,
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
 * PATCH /api/v1/professionals/me/profile
 *
 * The handful of settings a practising vet changes between appointments:
 * availability, weekly hours, consultation rate, reminder lead time.
 *
 * Only for a verified licence — an application still under review has nothing to
 * publish, so there is nothing here to set. Anything the applicant declared on the
 * form (their name, licence, clinic, years of experience) is absent from the schema
 * by construction: it was checked against a register, so it changes through an
 * admin or not at all.
 *
 * A partial merge, not a replace. Only the keys the caller actually sent are
 * written, so moving one value cannot quietly reset the rest.
 */
router.patch(
  '/me/profile',
  optionalAuth,
  signedIn,
  validate(professionalProfileUpdateSchema),
  async (req, res) => {
    const actor = actorOf(req);
    const body = req.body as ProfessionalProfileUpdate;

    const application = await findProfessionalByUser(actor._id);
    if (!application) return failReason(res, 404, 'You have not applied yet.', 'no-application');

    if (application.status !== 'verified') {
      return failReason(
        res,
        403,
        'Your licence is still under review, so there is nothing to publish yet.',
        'not-verified'
      );
    }

    const patch: ProfessionalProfilePatch = {};
    if (body.availabilityStatus !== undefined) patch.availabilityStatus = body.availabilityStatus;
    if (body.weeklySchedule !== undefined) patch.weeklySchedule = body.weeklySchedule;
    if (body.avatarUrl !== undefined) patch.avatarUrl = body.avatarUrl;
    if (body.workHistory !== undefined) patch.workHistory = body.workHistory;
    if (body.bookingNotificationMinutes !== undefined) {
      patch.bookingNotificationMinutes = body.bookingNotificationMinutes;
    }

    // Experience comes from the filed application rather than the request, so the
    // ceiling is the one their licence earned. Over it is allowed but recorded:
    // the flag is what puts the listing in front of a reviewer.
    if (body.hourlyRate !== undefined) {
      patch.hourlyRate = body.hourlyRate;
      patch.flaggedForRateReview =
        body.hourlyRate > calculateMaxRecommendedRate(application.yearsExperience);
    }

    const updated = await updateProfessionalProfile(application._id, patch);
    if (!updated) return fail(res, 500, 'Failed to update professional profile');

    const captures = await findCaptureIds(updated._id);
    ok(res, toOwnProfessional(updated, captures));
  }
);

/**
 * PATCH /api/v1/professionals/me/map-location
 *
 * Where one of a vet's addresses sits on the public map, and whether it is there at
 * all. One address per request, named by kind, so a vet who publishes their clinic and
 * keeps their home off the map does exactly that.
 *
 * Its own route rather than another field on `/me/profile`, because this writes one
 * element of the addresses array and that handler builds a patch of top-level fields.
 * Keeping them apart is what lets the write below name the two pin fields and nothing
 * else: the addresses themselves were checked against a register and a device, and no
 * request through here can reach a street line.
 *
 * A partial merge like its neighbour. An absent `pin` leaves the placement alone — so
 * flipping the switch does not require re-sending coordinates — and an absent
 * `showOnMap` leaves the publication alone, which is what lets the picker save a
 * dragged pin without also deciding to publish it.
 */
router.patch(
  '/me/map-location',
  optionalAuth,
  signedIn,
  validate(professionalMapUpdateSchema),
  async (req, res) => {
    const actor = actorOf(req);
    const body = req.body as ProfessionalMapUpdate;

    const application = await findProfessionalByUser(actor._id);
    if (!application) return failReason(res, 404, 'You have not applied yet.', 'no-application');

    if (application.status !== 'verified') {
      return failReason(
        res,
        403,
        'Your licence is still under review, so there is nothing to publish yet.',
        'not-verified'
      );
    }

    // The kind has to be one this vet actually filed. A vet who works from home has no
    // clinic address, and inventing one here would put a pin on a place nobody checked.
    const current = (application.addresses ?? []).find((address) => address.kind === body.kind);
    if (!current) {
      return failReason(
        res,
        404,
        `You have no ${body.kind} address on your application.`,
        'no-address'
      );
    }

    // The half the request did not carry, read off the stored address. Merged here so
    // the repository is handed a complete pair and derives the indexed point from it —
    // the same division of labour the appointments service uses for the slot hold.
    const pin =
      body.pin === undefined
        ? current.mapPin && {
            latitude: current.mapPin.latitude,
            longitude: current.mapPin.longitude,
          }
        : body.pin;
    const showOnMap = body.showOnMap ?? Boolean(current.mapPoint);

    // A switch that silently does nothing is worse than a refusal. There is no sensible
    // pin to invent: the verification fix is not one the vet chose to publish, and the
    // centre of their city is a lie about where they work.
    if (showOnMap && !pin) {
      return failReason(res, 400, 'Pin your location on the map before publishing it.', 'no-pin');
    }

    const updated = await updateAddressMap(application._id, {
      kind: body.kind,
      pin: pin ?? null,
      showOnMap,
    });
    if (!updated) return fail(res, 500, 'Failed to update your map location');

    const captures = await findCaptureIds(updated._id);
    ok(res, toOwnProfessional(updated, captures));
  }
);

/**
 * POST /api/v1/professionals/inquiries
 *
 * Stage one: the short form that opens a review. A reviewer reads it and either
 * emails an application link or turns it down — unless the automatic screen has
 * already turned it down, which it does for an enquiry that gives no licence number
 * or says in as many words that its writer is not a registered vet.
 *
 * Either way the answer is `201 { received: true }`. A refusal that named the rule it
 * fired would tell a spammer which field to change, and the applicant is told by
 * email, exactly as a decline by hand tells them.
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
      // Screened on the way in, and an enquiry the screen refuses is stored as a
      // declined row rather than bounced: see `submitInquiry` for why the answer
      // below is the same either way.
      await submitInquiry({ attrs: input, ip: req.ip ?? null });
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

/** Said the same way by both reads below. */
const NOT_LISTED = 'That professional is not in the directory';

/**
 * A verified listing joined to its account, or null.
 *
 * The list read does this in one aggregation for a page; this is the same two rules
 * applied to a single row — verified, and the account behind it still active. A
 * suspended vet is out of the directory, and one route answering differently from the
 * other is how a delisted profile stays reachable by its old link.
 */
async function listedProfessional(id: string) {
  const application = await findProfessionalById(id);
  if (!application || application.status !== 'verified') return null;

  const account = await findUserById(application.user);
  if (!account || (account.status ?? 'active') !== 'active') return null;

  return {
    ...application,
    account: {
      _id: account._id,
      name: account.name ?? null,
      avatarUrl: account.avatarUrl ?? null,
      status: account.status ?? ('active' as const),
    },
  };
}

/**
 * GET /api/v1/professionals/near?lat=&lng=&radiusKm=&limit=&available=
 *
 * The verified vets nearest a point, nearest first, with how far away each one is.
 *
 * Registered above `/:id` deliberately: Express matches in order, so the param route
 * would otherwise take "near" for an id and answer 404 for it.
 *
 * Public, like the directory it ranks — this is the same rows in a different order, and
 * a pet owner should not have to sign in to find out who is nearby. Only vets who put
 * a pin on the map and switched it on are in the answer at all; the rest are absent
 * because their coordinates are absent from the index, not because a filter here
 * remembered to exclude them.
 *
 * The caller's own coordinates are used to answer and then dropped. Nothing writes them
 * and nothing logs them: knowing where somebody stood while searching is not something
 * this service needs to keep.
 */
router.get('/near', validateQuery(professionalNearQuerySchema), async (req, res) => {
  const query = req.validatedQuery as ProfessionalNearQuery;

  const items = await findProfessionalsNear({
    latitude: query.lat,
    longitude: query.lng,
    radiusKm: query.radiusKm,
    limit: query.limit,
    available: query.available,
  });

  // The radius comes back with the answer so an empty list can say what was searched
  // rather than leaving a screen to guess at the number it asked with.
  ok(res, { items: items.map(toNearbyProfessional), radiusKm: query.radiusKm });
});

/**
 * GET /api/v1/professionals/:id
 *
 * One directory entry, which is where a booking starts. Public like the list it comes
 * out of — this is exactly one row of that list, and gating it would mean a pet owner
 * has to sign in before they can read who they might book.
 *
 * A listing that is pending, rejected or suspended answers 404 rather than 403.
 * Somebody with a guessed id has no business learning which of those it is.
 */
router.get('/:id', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, NOT_LISTED);

  const listing = await listedProfessional(req.params.id);
  if (!listing) return fail(res, 404, NOT_LISTED);

  ok(res, toPublicProfessional(listing));
});

/**
 * GET /api/v1/professionals/:id/slots?from=&to=
 *
 * The bookable grid, generated from the vet's weekly schedule with the slots already
 * held marked as taken.
 *
 * Behind a sign-in, unlike the listing itself: when somebody is booked is a fact about
 * their week rather than part of their advertisement, and an account is needed to book
 * anyway. The held rows are read from the same partial index that enforces the rule, so
 * the grid a client draws cannot disagree with the guard that refuses a booking.
 *
 * `minutes` comes back with the days so the client labels every button from the same
 * number the grid was cut with, rather than from a copy of the constant of its own.
 */
router.get(
  '/:id/slots',
  optionalAuth,
  signedIn,
  validateQuery(appointmentSlotsQuerySchema),
  async (req, res) => {
    if (!isValidObjectId(req.params.id)) return fail(res, 404, NOT_LISTED);

    const listing = await listedProfessional(req.params.id);
    if (!listing) return fail(res, 404, NOT_LISTED);

    const query = req.validatedQuery as AppointmentSlotsQuery;
    const to = query.to ?? query.from;
    const bounds = slotRangeBounds(query.from, to);

    const held = await findHeldSlots({
      professional: listing._id,
      from: bounds.from,
      to: bounds.to,
    });

    ok(res, {
      minutes: APPOINTMENT_SLOT_MINUTES,
      days: slotsForRange({
        schedule: listing.weeklySchedule ?? [],
        from: query.from,
        to,
        minutes: APPOINTMENT_SLOT_MINUTES,
        held,
      }),
    });
  }
);

export default router;
