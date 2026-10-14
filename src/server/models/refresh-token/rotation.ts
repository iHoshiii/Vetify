import crypto from 'node:crypto';
import { env } from '../../config/env';
import { refreshTokensCollection } from './services';
import { hashToken, isRefreshTokenActive } from './utils';
import type { RefreshTokenWithOwner } from './types';

export const REFRESH_GRACE_MS = 10_000;

function successor(raw: string): string {
  return crypto
    .createHmac('sha256', env.JWT_SECRET_ACCESS)
    .update(`vetify.refresh.rotation:${raw}`)
    .digest('hex');
}

export async function rotateRefreshToken(raw: string, token: RefreshTokenWithOwner) {
  if (!token.owner || (token.sessionVersion ?? 0) !== (token.owner.sessionVersion ?? 0))
    return null;
  const now = new Date();
  const tokenHash = hashToken(raw);
  const next = successor(raw);
  const collection = refreshTokensCollection();
  const rotated = await collection.findOneAndUpdate(
    {
      _id: token._id,
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
      $or: [{ previousValidUntil: { $lte: now } }, { previousValidUntil: { $exists: false } }],
    },
    {
      $set: {
        tokenHash: hashToken(next),
        previousTokenHash: tokenHash,
        previousValidUntil: new Date(now.getTime() + REFRESH_GRACE_MS),
        updatedAt: now,
      },
    },
    { returnDocument: 'after' }
  );
  if (rotated) return { token: next, expiresAt: rotated.expiresAt };

  const current = await collection.findOne({ _id: token._id });
  if (!current || !isRefreshTokenActive(current)) return null;
  if (current.tokenHash === tokenHash) return { token: raw, expiresAt: current.expiresAt };
  if (current.previousTokenHash !== tokenHash) return null;
  if (!current.previousValidUntil || current.previousValidUntil.getTime() <= Date.now()) {
    await collection.updateOne(
      { _id: current._id, previousTokenHash: tokenHash, previousValidUntil: { $lte: new Date() } },
      { $set: { revokedAt: new Date(), updatedAt: new Date() } }
    );
    return null;
  }
  return { token: next, expiresAt: current.expiresAt };
}
