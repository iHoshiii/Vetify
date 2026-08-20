import crypto from 'node:crypto';
import { type RefreshTokenDocument } from './types';

// hashes a refresh token using SHA-256 and returns the hex digest (includes numbers and letters)
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// pick the revokedAt and expiresAt fields from a refresh token document to check if it is active
export function isRefreshTokenActive(token: Pick<RefreshTokenDocument, 'revokedAt' | 'expiresAt'>) {
  // if token is not reveked and not expired in the current time/date, return true
  return !token.revokedAt && token.expiresAt.getTime() > Date.now();
}
