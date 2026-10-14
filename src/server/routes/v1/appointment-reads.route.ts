import { appointmentListQuerySchema, type AppointmentListQuery } from '@shared/schemas';
import { Router, type RequestHandler } from 'express';
import { validateQuery } from '../../middleware/validate';
import { findAppointments, tallyAppointments, toAppointmentPage } from '../../models';
import { isCallLive } from '../../realtime/hub';
import { ok } from '../../utils/response';
import { actorOf } from './caller';
import { partiesOf } from './appointment-presentation';

const router = Router();

function list(side: 'client' | 'professionalUser'): RequestHandler {
  return async (req, res) => {
    const viewer = actorOf(req);
    const query = req.validatedQuery as AppointmentListQuery;

    const { items, total } = await findAppointments({
      ...(side === 'client' ? { client: viewer._id } : { professionalUser: viewer._id }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
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
        callActive: (appointment) => isCallLive(appointment._id.toString()),
      })
    );
  };
}

router.get('/mine', validateQuery(appointmentListQuerySchema), list('client'));

router.get('/incoming', validateQuery(appointmentListQuerySchema), list('professionalUser'));
router.get('/incoming/counts', async (req, res) => {
  ok(res, { counts: await tallyAppointments(actorOf(req)._id) });
});

export default router;
