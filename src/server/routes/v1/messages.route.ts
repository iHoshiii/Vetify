import {
  messageListQuerySchema,
  messageSendSchema,
  threadListQuerySchema,
  threadOpenSchema,
  threadStateUpdateSchema,
  type MessageListQuery,
  type MessageSendInput,
  type ThreadListQuery,
  type ThreadOpenInput,
  type ThreadStateUpdateInput,
} from '@shared/schemas';
import { Router, type RequestHandler } from 'express';

import { optionalAuth } from '../../middleware/optionalAuth';
import { messageLimiter } from '../../middleware/security';
import { validate, validateQuery } from '../../middleware/validate';
import {
  countUnreadThreads,
  findMessages,
  findThreadById,
  findThreads,
  isValidObjectId,
  otherPartyOf,
  toMessagePage,
  toThreadPage,
  toThreadView,
  type ThreadDocument,
} from '../../models';
import {
  ensureParty,
  openThread,
  readThread,
  sendMessage,
  setThreadShelf,
} from '../../services/messages.service';
import { AppError } from '../../utils/AppError';
import { created, fail, ok } from '../../utils/response';
import { actorOf, signedIn } from './caller';
import { partiesOf } from './thread-parties';

const router = Router();

// A thread names two people and what they said, so nothing here is public.
router.use(optionalAuth, signedIn);

const MISSING = 'Conversation not found';

// One page of threads for whichever side the caller is on.
function list(side: 'client' | 'professionalUser'): RequestHandler {
  return async (req, res) => {
    const viewer = actorOf(req);
    const query = req.validatedQuery as ThreadListQuery;

    const { items, total } = await findThreads({
      ...(side === 'client' ? { client: viewer._id } : { professionalUser: viewer._id }),
      state: query.state,
      page: query.page,
      limit: query.limit,
    });

    ok(
      res,
      toThreadPage({
        items,
        viewer: viewer._id,
        parties: await partiesOf(items, viewer._id),
        total,
        page: query.page,
        limit: query.limit,
      })
    );
  };
}

// GET /mine — threads the caller started as an owner.
router.get('/mine', validateQuery(threadListQuerySchema), list('client'));

// GET /incoming — threads owners started with the caller as the vet. Scoped by id, so a non-vet gets an empty page.
router.get('/incoming', validateQuery(threadListQuerySchema), list('professionalUser'));

// GET /unread — the caller's total unread across both sides, for the launcher badge.
router.get('/unread', async (req, res) => {
  const side = req.query.side;
  if (side !== undefined && side !== 'mine' && side !== 'incoming') {
    return fail(res, 400, 'Unknown message side');
  }
  ok(res, { unread: await countUnreadThreads(actorOf(req)._id, side ?? 'all') });
});

// POST / — open (or reuse) the thread with a vet, then return it as the caller sees it.
router.post('/', validate(threadOpenSchema), async (req, res) => {
  const user = actorOf(req);
  const body = req.body as ThreadOpenInput;

  const thread = await openThread({ user, professionalId: body.professionalId });
  if (!thread) return fail(res, 404, 'That professional is not in the directory');

  const parties = await partiesOf([thread], user._id);
  created(res, {
    thread: toThreadView({
      thread,
      viewer: user._id,
      party: parties.get(otherPartyOf(thread, user._id)) ?? null,
    }),
  });
});

// The thread from the path, checked to belong to the caller. Shared by the two handlers below.
async function loadOwn(req: Parameters<RequestHandler>[0]): Promise<ThreadDocument> {
  if (!isValidObjectId(req.params.id)) throw AppError.notFound(MISSING);
  return ensureParty(await findThreadById(req.params.id), actorOf(req));
}

// GET /:id/messages — one page of a thread, and the caller's side marked read.
router.get('/:id/messages', validateQuery(messageListQuerySchema), async (req, res) => {
  const viewer = actorOf(req);
  const thread = await loadOwn(req);
  const query = req.validatedQuery as MessageListQuery;

  const { items, total } = await findMessages({
    thread: thread._id,
    page: query.page,
    limit: query.limit,
  });
  await readThread(thread, viewer);

  ok(
    res,
    toMessagePage({
      items,
      viewer: viewer._id,
      otherReadAt: thread.client.equals(viewer._id)
        ? thread.professionalReadAt
        : thread.clientReadAt,
      total,
      page: query.page,
      limit: query.limit,
    })
  );
});

// POST /:id/messages — send into a thread the caller is part of.
router.post('/:id/messages', messageLimiter, validate(messageSendSchema), async (req, res) => {
  const sender = actorOf(req);
  const thread = await loadOwn(req);
  const body = req.body as MessageSendInput;

  const message = await sendMessage({ thread, sender, body: body.body });
  created(res, {
    message: { id: message._id.toString(), createdAt: message.createdAt.toISOString() },
  });
});

// PATCH /:id/state — file the caller's own copy on a shelf: active, archived, spam, or deleted.
router.patch('/:id/state', validate(threadStateUpdateSchema), async (req, res) => {
  const user = actorOf(req);
  const thread = await loadOwn(req);
  const body = req.body as ThreadStateUpdateInput;

  await setThreadShelf({ thread, user, state: body.state });
  ok(res, { state: body.state });
});

export default router;
