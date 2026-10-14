import type { RequestHandler } from 'express';
import { findUserById } from '../models/users';
import { isValidObjectId } from '../models/object-id';
import { requireVerifiedEmail } from '../services/email-verification-access';
import { optionalAuth } from './optionalAuth';

const confirmationSessionPaths = new Set([
  '/auth/signup',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/email/verify',
  '/auth/email/resend',
  '/auth/native/signup',
  '/auth/native/login',
  '/auth/native/refresh',
  '/auth/native/logout',
  '/auth/native/email/verify',
  '/auth/native/email/resend',
]);

export const enforceEmailVerification: RequestHandler = async (req, res, next) => {
  const path = req.path.toLowerCase().replace(/\/+$/, '') || '/';
  if ((req.method === 'POST' && confirmationSessionPaths.has(path)) || path === '/health')
    return next();
  await optionalAuth(req, res, () => undefined);
  if (req.auth && isValidObjectId(req.auth.userId)) {
    const user = await findUserById(req.auth.userId);
    if (user) requireVerifiedEmail(user);
  }
  next();
};
