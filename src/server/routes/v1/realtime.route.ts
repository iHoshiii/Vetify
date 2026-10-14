import { Router } from 'express';
import { optionalAuth } from '../../middleware/optionalAuth';
import { signedIn } from './caller';
import { socketSession } from '../../realtime/session';
import { issueTicket } from '../../realtime/gateway/tickets';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/AppError';

const router = Router();
router.post('/realtime-ticket', optionalAuth, signedIn, async (req, res) => {
  const token = req.headers.authorization?.slice('Bearer '.length) ?? '';
  const session = await socketSession(token).catch(() => {
    throw AppError.unauthorized('Use an active browser sign-in.', 'browser-session-required');
  });
  const clientId = req.body?.clientId;
  if (typeof clientId !== 'string' || !/^[a-f0-9-]{36}$/.test(clientId))
    throw AppError.badRequest('Invalid realtime client');
  res.setHeader('Cache-Control', 'no-store');
  ok(res, { ticket: await issueTicket(session, clientId), expiresIn: 30 });
});
export default router;
