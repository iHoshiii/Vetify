import { Router } from 'express';
import mongoose from 'mongoose';

import authRoute from './auth.route';
import chatRoute from './chat.route';

const router = Router();

const DB_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

/**
 * Liveness plus a DB readiness flag. Returns 200 even when Mongo is down — the
 * chat endpoint has no DB dependency, so the process is still useful.
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: DB_STATES[mongoose.connection.readyState] ?? 'unknown',
    uptime: Math.floor(process.uptime()),
  });
});

router.use('/chat', chatRoute);
router.use('/auth', authRoute);

export default router;
