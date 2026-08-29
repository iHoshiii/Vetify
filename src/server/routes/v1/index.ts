import { Router } from 'express';

import { dbStatus } from '../../config/db';
import adminRoute from './admin';
import appointmentsRoute from './appointments.route';
import authRoute from './auth.route';
import blogsRoute from './blogs.route';
import chatRoute from './chat.route';
import professionalsRoute from './professionals.route';

const router = Router();

/**
 * Liveness plus a DB readiness flag. Returns 200 even when Mongo is down — the
 * chat endpoint has no DB dependency, so the process is still useful.
 *
 * The flag now comes from the driver's heartbeat rather than Mongoose's
 * readyState, so the transient 'connecting' and 'disconnecting' values are gone:
 * a server that is not currently answering reads as 'disconnected'.
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: dbStatus(),
    uptime: Math.floor(process.uptime()),
  });
});

router.use('/chat', chatRoute);
router.use('/auth', authRoute);
router.use('/blogs', blogsRoute);
router.use('/appointments', appointmentsRoute);
router.use('/professionals', professionalsRoute);
router.use('/admin', adminRoute);

export default router;
