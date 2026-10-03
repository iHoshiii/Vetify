import {
  appointmentRateSchema,
  appointmentRefuseSchema,
  appointmentReplySchema,
  type AppointmentRate,
  type AppointmentRefuse,
  type AppointmentReply,
} from '@shared/schemas';
import { Router, type RequestHandler } from 'express';
import { validate } from '../../middleware/validate';
import { isValidObjectId } from '../../models';
import {
  cancelAppointment,
  decideAppointment,
  rateAppointment,
  type AppointmentDecision,
} from '../../services/appointments.service';
import { replyToReview } from '../../services/review-reply.service';
import { fail, ok } from '../../utils/response';
import { actorOf } from './caller';
import { MISSING, savedViewOf } from './appointment-presentation';

const router = Router();

function decision(kind: AppointmentDecision): RequestHandler {
  return async (req, res) => {
    const professional = actorOf(req);
    const body = req.body as Partial<AppointmentRefuse>;

    if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

    const result = await decideAppointment({
      id: req.params.id,
      decision: kind,
      professional,
      reason: body.reason ?? null,
    });

    if (!result) return fail(res, 404, MISSING);

    ok(res, {
      appointment: await savedViewOf(result.appointment, professional._id),
      mail: result.mail,
    });
  };
}

router.patch('/:id/confirm', decision('confirmed'));

router.patch('/:id/decline', validate(appointmentRefuseSchema), decision('declined'));

router.patch('/:id/complete', decision('completed'));

router.patch('/:id/cancel', validate(appointmentRefuseSchema), async (req, res) => {
  const actor = actorOf(req);
  const body = req.body as AppointmentRefuse;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

  const result = await cancelAppointment({ id: req.params.id, actor, reason: body.reason });
  if (!result) return fail(res, 404, MISSING);

  ok(res, {
    appointment: await savedViewOf(result.appointment, actor._id),
    mail: result.mail,
  });
});
router.patch('/:id/rate', validate(appointmentRateSchema), async (req, res) => {
  const actor = actorOf(req);
  const body = req.body as AppointmentRate;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

  const result = await rateAppointment({
    id: req.params.id,
    actor,
    rating: body.rating,
    comment: body.comment,
  });
  if (!result) return fail(res, 404, MISSING);

  ok(res, { appointment: await savedViewOf(result, actor._id) });
});
router.post('/:id/reply', validate(appointmentReplySchema), async (req, res) => {
  const actor = actorOf(req);
  const body = req.body as AppointmentReply;

  if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

  const result = await replyToReview({ id: req.params.id, actor, reply: body.reply });
  if (!result) return fail(res, 404, MISSING);

  ok(res, { reply: result.reviewReply, repliedAt: result.reviewReplyAt?.toISOString() ?? null });
});

export default router;
