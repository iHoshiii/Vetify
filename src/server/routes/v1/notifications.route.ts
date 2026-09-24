import { notificationListQuerySchema, type NotificationListQuery } from '@shared/schemas';
import { Router } from 'express';

import { optionalAuth } from '../../middleware/optionalAuth';
import { validateQuery } from '../../middleware/validate';
import { isValidObjectId } from '../../models';
import {
  countUnread,
  listForUser,
  markAllRead,
  markRead,
} from '../../services/notifications.service';
import { fail, ok } from '../../utils/response';
import { actorOf, signedIn } from './caller';

const router = Router();

// A notification is addressed to one account, so the gate is on the router and every read is scoped to the caller.
router.use(optionalAuth, signedIn);

const MISSING = 'Notification not found';

// GET / — one page of the caller's own notifications, newest first.
router.get('/', validateQuery(notificationListQuerySchema), async (req, res) => {
  const query = req.validatedQuery as NotificationListQuery;
  ok(res, await listForUser({ user: actorOf(req)._id, page: query.page, limit: query.limit }));
});

// GET /unread — the caller's unread total, for the bell badge.
router.get('/unread', async (req, res) => {
  ok(res, { unread: await countUnread(actorOf(req)._id) });
});

// PATCH /read-all — clear the caller's whole unread count in one write.
router.patch('/read-all', async (req, res) => {
  ok(res, { read: await markAllRead(actorOf(req)._id) });
});

// PATCH /:id/read — mark one read, scoped to the caller so only their own can be touched.
router.patch('/:id/read', async (req, res) => {
  if (!isValidObjectId(req.params.id)) return fail(res, 404, MISSING);

  const notification = await markRead(req.params.id, actorOf(req)._id);
  if (!notification) return fail(res, 404, MISSING);
  ok(res, { notification });
});

export default router;
