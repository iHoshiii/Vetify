import { messageEditSchema, type MessageEditInput } from '@shared/schemas';
import { Router, type RequestHandler } from 'express';

import { messageActionLimiter } from '../../middleware/security';
import { validate } from '../../middleware/validate';
import { findThreadById, isValidObjectId, toMessageView, type ThreadDocument } from '../../models';
import { deleteMessage, editOwnMessage } from '../../services/message-actions.service';
import { ensureParty } from '../../services/messages.service';
import { AppError } from '../../utils/AppError';
import { ok } from '../../utils/response';
import { actorOf } from './caller';

const router = Router({ mergeParams: true });

async function loadOwn(req: Parameters<RequestHandler>[0]): Promise<ThreadDocument> {
  if (!isValidObjectId(req.params.id)) throw AppError.notFound('Message not found');
  return ensureParty(await findThreadById(req.params.id), actorOf(req));
}

function messageIdOf(req: Parameters<RequestHandler>[0]): string {
  const messageId = req.params.messageId;
  if (typeof messageId !== 'string' || !isValidObjectId(messageId)) {
    throw AppError.notFound('Message not found');
  }
  return messageId;
}

router.patch('/:messageId', messageActionLimiter, validate(messageEditSchema), async (req, res) => {
  const user = actorOf(req);
  const message = await editOwnMessage({
    thread: await loadOwn(req),
    user,
    messageId: messageIdOf(req),
    body: (req.body as MessageEditInput).body,
  });
  ok(res, { message: toMessageView(message, user._id) });
});

router.delete('/:messageId', messageActionLimiter, async (req, res) => {
  const user = actorOf(req);
  const result = await deleteMessage({
    thread: await loadOwn(req),
    user,
    messageId: messageIdOf(req),
  });
  ok(res, {
    message: result.message ? toMessageView(result.message, user._id) : null,
    removedForYou: result.removedForYou,
  });
});

export default router;
