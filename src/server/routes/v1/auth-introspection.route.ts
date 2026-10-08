import { defaultUserPreferences } from '@shared/schemas';
import { Router } from 'express';
import { introspectionGuard } from '../../middleware/introspection-guard';
import { activeNativeSession } from '../../models/native-session';
import { findUserById } from '../../models/users';
import { currentStatus } from '../../services/user-status.service';
import { AppError } from '../../utils/AppError';
import { ok } from '../../utils/response';

const router = Router();
function accountRegion(timeZone?: string) {
  try {
    if (timeZone) {
      new Intl.DateTimeFormat('en', { timeZone });
      return { timeZone };
    }
  } catch {
    return defaultUserPreferences().region;
  }
  return defaultUserPreferences().region;
}
router.post('/introspect', introspectionGuard, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const claims = req.introspectionClaims;
  if (!claims) throw AppError.unauthorized();
  const user = await findUserById(claims.sub);
  if (!user) throw AppError.unauthorized('Your account no longer exists.');
  let boundary = claims.exp * 1000;
  if (claims.nativeSessionId !== undefined) {
    if (typeof claims.nativeSessionId !== 'string') throw AppError.unauthorized();
    const session = await activeNativeSession(claims.nativeSessionId, claims.sub);
    if (!session) throw AppError.unauthorized('Your mobile session was revoked.');
    boundary = Math.min(boundary, session.expiresAt.getTime());
  }
  const status = await currentStatus(user);
  ok(res, {
    version: 1,
    user: { id: user._id.toHexString(), role: user.role ?? 'user', status },
    region: accountRegion(user.preferences?.region?.timeZone),
    subscription: { plan: 'free', status: null, expiresAt: null },
    entitlements: [],
    tokenExpiresAt: new Date(claims.exp * 1000).toISOString(),
    validUntil: new Date(Math.min(boundary, Date.now() + 30_000)).toISOString(),
  });
});

export default router;
