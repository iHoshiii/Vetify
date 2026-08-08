import { loginSchema, signupSchema, type LoginInput, type SignupInput } from '@shared/schemas';
import { Router } from 'express';

import { validate } from '../../middleware/validate';
import { hashToken } from '../../models/RefreshToken';
import { User } from '../../models/User';
import {
  createAuthPayloadFor,
  findRefreshTokenByHash,
  revokeRefreshTokenByHash,
  signAccessToken,
} from '../../services/auth.service';
import { fail, ok } from '../../utils/response';

const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', validate(signupSchema), async (req, res) => {
  const payload = req.body as SignupInput;

  const existing = await User.findOne({ email: payload.email });
  if (existing) return fail(res, 409, 'User with that email already exists');

  const user = await User.create({
    email: payload.email,
    password: payload.password,
    name: payload.name,
  });
  const auth = await createAuthPayloadFor(user);

  // Set refresh cookie
  res.cookie('refresh_token', auth.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: auth.expiresAt,
  });

  ok(res, { accessToken: auth.accessToken, user: auth.user });
});

// POST /api/v1/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const payload = req.body as LoginInput;
  const user = await User.findOne({ email: payload.email }).select('+password');
  if (!user) return fail(res, 401, 'Invalid credentials');

  const match = await user.comparePassword(payload.password);
  if (!match) return fail(res, 401, 'Invalid credentials');

  const auth = await createAuthPayloadFor(user);
  res.cookie('refresh_token', auth.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: auth.expiresAt,
  });

  ok(res, { accessToken: auth.accessToken, user: auth.user });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res) => {
  const raw =
    req.cookies?.[process.env.REFRESH_COOKIE_NAME ?? 'refresh_token'] || req.cookies?.refresh_token;
  if (!raw) return fail(res, 401, 'Missing refresh token');

  const tokenHash = hashToken(raw as string);
  const rt = await findRefreshTokenByHash(tokenHash);
  if (!rt || !rt.isActive()) return fail(res, 401, 'Invalid or expired refresh token');

  const user = rt.user;
  const accessToken = signAccessToken({ sub: user._id.toString(), email: user.email });
  ok(res, { accessToken });
});

// POST /api/v1/auth/logout
router.post('/logout', async (req, res) => {
  const raw =
    req.cookies?.[process.env.REFRESH_COOKIE_NAME ?? 'refresh_token'] || req.cookies?.refresh_token;
  if (raw) {
    await revokeRefreshTokenByHash(hashToken(raw as string));
  }
  res.clearCookie(process.env.REFRESH_COOKIE_NAME ?? 'refresh_token');
  ok(res, { loggedOut: true });
});

export default router;
