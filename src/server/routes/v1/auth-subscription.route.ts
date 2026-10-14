import { Router } from 'express';
import { optionalAuth } from '../../middleware/optionalAuth';
import { currentSubscription } from '../../services/subscription.service';
import { ok } from '../../utils/response';
import { actorOf, signedIn } from './caller';

const router = Router();

router.get('/subscription', optionalAuth, signedIn, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  ok(res, { subscription: await currentSubscription(actorOf(req)._id) });
});

export default router;
