import { Router } from 'express';

import { chatRequestSchema, type ChatRequest } from '@shared/schemas';

import { chatLimiter } from '../../middleware/security';
import { validate } from '../../middleware/validate';
import { generateReply } from '../../services/chat.service';
import { ok } from '../../utils/response';

const router = Router();

/**
 * POST /api/v1/chat
 *
 * `validate` has already parsed and defaulted req.body. Express 5 forwards a
 * rejected promise to the error handler, so no try/catch is needed here.
 */
router.post('/', chatLimiter, validate(chatRequestSchema), async (req, res) => {
  const reply = await generateReply(req.body as ChatRequest);
  ok(res, { reply });
});

export default router;
