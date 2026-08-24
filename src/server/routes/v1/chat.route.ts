import { FREE_ANON_QUERIES } from '@shared/limits';
import { Router, type NextFunction, type Request, type Response } from 'express';

import { chatRequestSchema, type ChatRequest } from '@shared/schemas';

import { optionalAuth } from '../../middleware/optionalAuth';
import { anonChatLimiter, chatLimiter } from '../../middleware/security';
import { validate } from '../../middleware/validate';
import { recordActivity } from '../../models/activity-event';
import { consumeAnonQuery, ensureAnonId } from '../../services/anon-quota';
import { generateReply } from '../../services/chat.service';
import { failReason, ok } from '../../utils/response';

const router = Router();

/**
 * Spends one of the anonymous allowance, or waves signed-in callers straight
 * through. Runs before `validate` so a visitor past their limit is turned away
 * without the request body being parsed, and well before anything reaches
 * Gemini — the whole point is not paying for the call.
 */
async function enforceAnonQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.auth) return next();

  const anonId = ensureAnonId(req, res);
  const verdict = await consumeAnonQuery(anonId);

  if (!verdict.allowed) {
    failReason(
      res,
      429,
      `You have used your ${FREE_ANON_QUERIES} free questions for today. Log in to keep chatting.`,
      'anon-quota'
    );
    return;
  }

  res.locals.anonRemaining = verdict.remaining;
  // Kept for the activity event below, so an anonymous conversation is still
  // attributable to one visitor without a second cookie read.
  res.locals.anonId = anonId;
  next();
}

/**
 * POST /api/v1/chat
 *
 * `validate` has already parsed and defaulted req.body. Express 5 forwards a
 * rejected promise to the error handler, so no try/catch is needed here.
 *
 * anonRemaining is echoed back for unauthenticated callers so the client's
 * countdown follows the server's count rather than its own localStorage guess.
 */
router.post(
  '/',
  optionalAuth,
  chatLimiter,
  anonChatLimiter,
  enforceAnonQuota,
  validate(chatRequestSchema),
  async (req, res) => {
    const body = req.body as ChatRequest;
    const reply = await generateReply(body);

    recordActivity({
      type: 'chat.message_sent',
      user: req.auth?.userId ?? null,
      anonId: (res.locals.anonId as string | undefined) ?? null,
      metadata: { model: body.model },
    });

    const anonRemaining = res.locals.anonRemaining as number | undefined;
    ok(res, anonRemaining === undefined ? { reply } : { reply, anonRemaining });
  }
);

export default router;
