import { defaultUserPreferences } from '@shared/schemas';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { activeNativeSession } from '../../models/native-session';
import { findUserById } from '../../models/users';
import { isValidObjectId } from '../../models/object-id';
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
router.post('/introspect', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const bearer = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization ?? '');
  if (!bearer) throw AppError.unauthorized();
  let claims: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(bearer[1], env.JWT_SECRET_ACCESS, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') throw new Error('Invalid access token');
    claims = decoded;
  } catch {
    throw AppError.unauthorized('Invalid or expired access token.');
  }
  if (!claims.sub || !isValidObjectId(claims.sub) || !claims.exp) {
    throw AppError.unauthorized('Invalid access token claims.');
  }
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
