import { subscriptionUpdateSchema, type SubscriptionUpdate } from '@shared/subscriptions';
import { Router } from 'express';
import { ObjectId } from 'mongodb';
import { validate } from '../../../middleware/validate';
import { findUserById } from '../../../models/users';
import { isValidObjectId } from '../../../models/object-id';
import { changeSubscription, currentSubscription } from '../../../services/subscription.service';
import { fail, ok } from '../../../utils/response';
import { adminOf, ipOf } from './shared';

const router = Router();

router.get('/:id/subscription', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Account not found');
  const user = await findUserById(req.params.id);
  if (!user) return fail(res, 404, 'Account not found');
  ok(res, { subscription: await currentSubscription(user._id) });
});

router.put('/:id/subscription', validate(subscriptionUpdateSchema), async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!isValidObjectId(req.params.id)) return fail(res, 404, 'Account not found');
  const subscription = await changeSubscription({
    user: new ObjectId(req.params.id),
    update: req.body as SubscriptionUpdate,
    admin: adminOf(req),
    ip: ipOf(req),
  });
  ok(res, { subscription });
});

export default router;
