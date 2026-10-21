import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env';
import { booksCapabilityGuard } from '../../middleware/books-capability-guard';
import { validate } from '../../middleware/validate';
import { findProfessionalByUser } from '../../models/professionals';
import { findUserById } from '../../models/users';
import { currentStatus } from '../../services/user-status.service';
import { AppError } from '../../utils/AppError';
import { ok } from '../../utils/response';

const router = Router();
const capabilityRequest = z
  .object({
    userId: z.string().regex(/^[a-f0-9]{24}$/),
    audience: z.literal('vetify-books'),
  })
  .strict();

router.post(
  '/books-capabilities',
  booksCapabilityGuard,
  validate(capabilityRequest),
  async (req, res) => {
    const { userId } = req.body as z.infer<typeof capabilityRequest>;
    const user = await findUserById(userId);
    if (!user) throw AppError.notFound('The author account no longer exists.');
    const status = await currentStatus(user);
    if (status !== 'active' || user.emailVerified !== true) {
      throw AppError.forbidden('The author must have an active account and verified email.');
    }
    const professional = await findProfessionalByUser(user._id);
    // Main's interview is still pending; a suspended approval is revoked for Books.
    const approval =
      professional?.status === 'interview'
        ? 'pending'
        : professional?.status === 'suspended'
        ? 'revoked'
        : professional?.status;
    const now = Date.now();
    const expiry = Date.parse(env.BOOKS_CAPABILITY_TOKEN_EXPIRES_AT!);
    if (expiry <= now) throw AppError.unauthorized('Expired Books service credential.');
    ok(res, {
      version: 2,
      issuer: new URL(env.SERVER_URL).origin,
      audience: 'vetify-books',
      user: { id: user._id.toHexString(), role: user.role ?? 'user', status },
      emailVerified: true,
      ...(approval ? { professional: { status: approval } } : {}),
      validUntil: new Date(Math.min(now + 30_000, expiry)).toISOString(),
    });
  }
);

export default router;
