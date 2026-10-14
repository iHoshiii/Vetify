import { Router } from 'express';
import {
  nativeSocialContextSchema,
  nativeSocialExchangeSchema,
  nativeSocialStartSchema,
} from '../../../shared/native-auth';
import { authLimiter } from '../../middleware/auth-limiter';
import { validate } from '../../middleware/validate';
import { consumeNativeSocialGrant } from '../../models/native-social-grant';
import { findUserById } from '../../models/users';
import { createNativeSession } from '../../services/native-session.service';
import { nativeProviderStartUrl } from '../../services/native-social.service';
import { getProviderConfig } from '../../services/oauth.service';
import { AppError } from '../../utils/AppError';
import { failReason, ok } from '../../utils/response';

const router = Router();
router.post('/start', authLimiter, validate(nativeSocialStartSchema), (req, res) => {
  const { provider, ...native } = nativeSocialStartSchema.parse(req.body);
  if (!getProviderConfig(provider)) {
    return failReason(res, 503, 'This sign-in provider is not configured yet.', 'unconfigured');
  }
  ok(res, { url: nativeProviderStartUrl(provider, nativeSocialContextSchema.parse(native)) });
});

router.post('/exchange', authLimiter, validate(nativeSocialExchangeSchema), async (req, res) => {
  const grant = await consumeNativeSocialGrant(nativeSocialExchangeSchema.parse(req.body));
  if (!grant) throw AppError.unauthorized('This mobile sign-in expired or was already used.');
  const user = await findUserById(grant.user);
  if (!user) throw AppError.unauthorized('This account is no longer available.');
  ok(res, await createNativeSession(user));
});
export default router;
