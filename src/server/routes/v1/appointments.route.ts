import {
  appointmentConfirmSchema,
  appointmentListQuerySchema,
  appointmentRefuseSchema,
  appointmentRequestSchema,
  type AppointmentConfirm,
  type AppointmentListQuery,
  type AppointmentRefuse,
  type AppointmentRequest,
} from '@shared/schemas';
import { Router, type RequestHandler } from 'express';

import { optionalAuth } from '../../middleware/optionalAuth';
import { bookingLimiter } from '../../middleware/security';
import { validate, validateQuery } from '../../middleware/validate';
import {
  findAppointments,
  findUsersByIds,
  isDuplicateSlot,
  isValidObjectId,
  otherPartyId,
  toAppointmentPage,
  toAppointmentView,
  type AppointmentDocument,
  type AppointmentParty,
} from '../../models';
import {
  cancelAppointment,
  decideAppointment,
  requestAppointment,
  type AppointmentDecision,
} from '../../services/appointments.service';
import { created, fail, failReason, ok } from '../../utils/response';
import { actorOf, signedIn } from './caller';

import type { ObjectId } from 'mongodb';

const router = Router();

/**
 * Nothing on this surface is public, so the gate is on the router rather than
 * repeated per route: a booking names two people, an animal and a reason, and none of
 * that is anybody else's.
 *
 * Authorisation beyond "is a real account" is per booking rather than per role, and
 * lives in the service — only the vet a booking is with may confirm it, and only its
 * two parties may cancel it. A role gate could not express either.
 */
router.use(optionalAuth, signedIn);

/** Said the same way by every handler here. */
const MISSING = 'Appointment not found';

/**
 * The accounts on the other side of a page of bookings, in one read.
 *
 * One `$in` rather than a lookup per row, the same shape the admin queue uses for the
 * accounts behind its applications. "The other side" is computed by `otherPartyId` so
 * this and the transform cannot disagree and show somebody their own name.
 */
async function partiesOf(
  items: AppointmentDocument[],
  viewer: ObjectId
): Promise<Map<string, AppointmentParty>> {
  const ids = [...new Set(items.map((item) => otherPartyId(item, viewer)))];
  const users = await findUsersByIds(ids);

  return new Map(
    users.map((user) => [
      user._id.toString(),
      {
        id: user._id.toString(),
        name: user.name ?? null,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
      },
    ])
  );
}

/** One booking on its way back out, with whoever is on the other side of it. */
async function viewOf(appointment: AppointmentDocument, viewer: ObjectId) {
  const parties = await partiesOf([appointment], viewer);

  return toAppointmentView({
    appointment,
    viewer,
    party: parties.get(otherPartyId(appointment, viewer)) ?? null,
  });
}

/**
 * POST /api/v1/appointments
 *
 * Asks for a slot. Answers 201 with the booking as a request — nothing is confirmed
 * here, because nobody takes a vet's time without the vet agreeing to it.
 *
 * The 409 is the interesting answer: the unique index refused the insert because
 * somebody else holds that slot. It is reported as its own reason so the page can
 * redraw the grid and say "that one just went" rather than "something went wrong",
 * which is the difference between a race the user understands and a bug they report.
 */
router.post('/', bookingLimiter, validate(appointmentRequestSchema), async (req, res) => {
  const client = actorOf(req);
  const body = req.body as AppointmentRequest;

  try {
    const result = await requestAppointment({
      client,
      professionalId: body.professionalId,
      kind: body.kind,
      startsAt: new Date(body.startsAt),
      petName: body.petName,
      petSpecies: body.petSpecies,
      reason: body.reason,
      phone: body.phone ?? null,
    });

    if (!result) return fail(res, 404, 'That professional is not in the directory');

    created(res, {
      appointment: await viewOf(result.appointment, client._id),
      // Both, separately. The vet not hearing is the failure worth acting on: the
      // booking exists and is holding a slot either way.
      mail: result.mail,
    });
  } catch (err) {
    if (isDuplicateSlot(err)) {
      return failReason(
        res,
        409,
        'Somebody just took that time. Pick another and we will hold it for you.',
        'slot-taken'
      );
    }
    throw err;
  }
});

/** One page of bookings, for whichever side of them the caller is on. */
function list(side: 'client' | 'professionalUser'): RequestHandler {
  return async (req, res) => {
    const viewer = actorOf(req);
    const query = req.validatedQuery as AppointmentListQuery;

    const { items, total } = await findAppointments({
      // Spread rather than a computed key, so the two sides stay two named fields
      // the repository can type-check instead of one string it has to trust.
      ...(side === 'client' ? { client: viewer._id } : { professionalUser: viewer._id }),
      ...(query.status ? { status: query.status } : {}),
      page: query.page,
      limit: query.limit,
    });

    ok(
      res,
      toAppointmentPage({
        items,
        viewer: viewer._id,
        parties: await partiesOf(items, viewer._id),
        total,
        page: query.page,
        limit: query.limit,
      })
    );
  };
}

/**
 * GET /api/v1/appointments/mine
 *
 * What the caller has booked. Scoped by the signed-in account rather than by a
 * parameter, so there is no id anybody could change to read somebody else's.
 */
router.get('/mine', validateQuery(appointmentListQuerySchema), list('client'));

/**
 * GET /api/v1/appointments/incoming
 *
 * What has been booked with the caller. Scoped the same way, which is also why this
 * needs no professional-role gate: an account that is not a vet simply has none.
 */
router.get('/incoming', validateQuery(appointmentListQuerySchema), list('professionalUser'));

/**
 * The vet's three answers differ only in their word and in what they owe, so they
 * share a handler. Which statuses each may be reached from, and the rule that a
 * virtual consultation needs a link, live in the service where the stored booking is.
 */
function decision(kind: AppointmentDecision): RequestHandler {
  return async (req, res) => {
    const professional = actorOf(req);
    const body = req.body as Partial<AppointmentConfirm & AppointmentRefuse>;

    if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

    const result = await decideAppointment({
      id: req.params.id,
      decision: kind,
      professional,
      meetingUrl: body.meetingUrl ?? null,
      reason: body.reason ?? null,
    });

    if (!result) return fail(res, 404, MISSING);

    ok(res, {
      appointment: await viewOf(result.appointment, professional._id),
      // Null for a completion, which owes the owner nothing: they were there.
      mail: result.mail,
    });
  };
}

/**
 * PATCH /api/v1/appointments/:id/confirm
 *
 * Yes. Keeps the slot held and emails the owner — with the meeting link, when the
 * booking is a virtual one, which the service refuses to confirm without.
 */
router.patch('/:id/confirm', validate(appointmentConfirmSchema), decision('confirmed'));

/**
 * PATCH /api/v1/appointments/:id/decline
 *
 * No, with a reason the owner is shown. Frees the slot immediately, which is the half
 * that matters: a refusal that kept the time would be a refusal nobody else benefits
 * from.
 */
router.patch('/:id/decline', validate(appointmentRefuseSchema), decision('declined'));

/**
 * PATCH /api/v1/appointments/:id/complete
 *
 * It happened. Keeps the slot held, because that time was in fact used and a grid
 * that offered it again later would be wrong about the past.
 */
router.patch('/:id/complete', decision('completed'));

/**
 * PATCH /api/v1/appointments/:id/cancel
 *
 * Either side calling off something still ahead of them. One route for both, because
 * the move is identical and the only difference is which address the email goes to —
 * which the stored `cancelledBy` decides rather than the caller.
 */
router.patch('/:id/cancel', validate(appointmentRefuseSchema), async (req, res) => {
  const actor = actorOf(req);
  const body = req.body as AppointmentRefuse;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

  const result = await cancelAppointment({ id: req.params.id, actor, reason: body.reason });
  if (!result) return fail(res, 404, MISSING);

  ok(res, {
    appointment: await viewOf(result.appointment, actor._id),
    mail: result.mail,
  });
});

export default router;
