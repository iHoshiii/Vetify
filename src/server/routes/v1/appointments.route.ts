import { appointmentRequestSchema, type AppointmentRequest } from '@shared/schemas';
import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../../middleware/optionalAuth';
import { bookingLimiter } from '../../middleware/security';
import { validate } from '../../middleware/validate';
import { isDuplicateSlot } from '../../models';
import { requestAppointment } from '../../services/appointments.service';
import { created, fail, failReason } from '../../utils/response';
import { actorOf, signedIn } from './caller';
import { savedViewOf } from './appointment-presentation';
import reads from './appointment-reads.route';
import writes from './appointment-writes.route';

const router = Router();
router.use(optionalAuth, signedIn);
const requestIdSchema = z.string().uuid().optional();

router.post('/', bookingLimiter, validate(appointmentRequestSchema), async (req, res) => {
  const client = actorOf(req);
  const body = req.body as AppointmentRequest;
  const requestId = requestIdSchema.safeParse(req.get('Idempotency-Key'));
  if (!requestId.success) return fail(res, 400, 'Provide a valid booking request ID');

  try {
    const result = await requestAppointment({
      client,
      requestId: requestId.data,
      professionalId: body.professionalId,
      kind: body.kind,
      startsAt: new Date(body.startsAt),
      slots: body.slots,
      petName: body.petName,
      petSpecies: body.petSpecies,
      petBreed: body.petBreed,
      petAge: body.petAge,
      reason: body.reason,
      phone: body.phone ?? null,
      clientEmail: body.clientEmail ?? null,
    });

    if (!result) return fail(res, 404, 'That professional is not in the directory');

    created(res, {
      appointment: await savedViewOf(result.appointment, client._id),
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

router.use(reads, writes);

export default router;
