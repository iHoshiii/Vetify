import { ObjectId, type Collection, type IndexDescription } from 'mongodb';
import crypto from 'node:crypto';

import { getDb } from '../config/db';
import { toObjectId } from './object-id';
import { USERS_COLLECTION, type User } from './users';

export const REFRESH_TOKENS_COLLECTION = 'refreshtokens';

export type RefreshTokenDocument = {
  _id: ObjectId;
  // SHA-256 of the token, never the token itself: a database leak must not
  // hand out usable sessions. A fast digest rather than bcrypt is right here
  // because the input is 256 bits of entropy, not a guessable password — and
  // rotation needs lookup-by-value, which bcrypt's per-row salt prevents.
  tokenHash: string;
  user: ObjectId;
  expiresAt: Date;
  /** Set when the token is rotated or logged out. Presence means "spent". */
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** A token joined to its owner, with the owner's hash left behind in Mongo. */
export type RefreshTokenWithOwner = RefreshTokenDocument & { owner: User | null };

export const REFRESH_TOKEN_INDEXES: IndexDescription[] = [
  { key: { tokenHash: 1 }, unique: true },
  { key: { user: 1 } },
  // Mongo drops documents once expiresAt passes, so revoked and stale rows do
  // not accumulate. The sweep runs about once a minute, so it is a cleanup
  // mechanism and not an access-control one — isRefreshTokenActive below is what
  // actually gates use.
  { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
];

export function refreshTokensCollection(): Collection<RefreshTokenDocument> {
  return getDb().collection<RefreshTokenDocument>(REFRESH_TOKENS_COLLECTION);
}

/** Digest helper so callers never have to remember the algorithm. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function isRefreshTokenActive(token: Pick<RefreshTokenDocument, 'revokedAt' | 'expiresAt'>) {
  return !token.revokedAt && token.expiresAt.getTime() > Date.now();
}

export async function insertRefreshToken(attrs: {
  tokenHash: string;
  user: string | ObjectId;
  expiresAt: Date;
}): Promise<RefreshTokenDocument> {
  const now = new Date();
  const doc: RefreshTokenDocument = {
    _id: new ObjectId(),
    tokenHash: attrs.tokenHash,
    user: toObjectId(attrs.user),
    expiresAt: attrs.expiresAt,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await refreshTokensCollection().insertOne(doc);
  return doc;
}

export function findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
  return refreshTokensCollection().findOne({ tokenHash });
}

/**
 * The refresh endpoint needs the token and its owner together, which is what
 * `.populate('user')` did. Doing it as one `$lookup` keeps it to a single round
 * trip; the `$unset` is what stops the join from carrying the owner's password
 * hash back with it, since a lookup returns the whole foreign document.
 */
export async function findRefreshTokenWithOwner(
  tokenHash: string
): Promise<RefreshTokenWithOwner | null> {
  const [result] = await refreshTokensCollection()
    .aggregate<RefreshTokenWithOwner>([
      { $match: { tokenHash } },
      // tokenHash is unique, so this only ever removes work from the join.
      { $limit: 1 },
      {
        $lookup: {
          from: USERS_COLLECTION,
          localField: 'user',
          foreignField: '_id',
          as: 'owner',
        },
      },
      // A token whose user was deleted still has to come back, so the caller can
      // tell "no such token" apart from "orphaned token" and reject each on its
      // own terms. preserveNullAndEmptyArrays leaves the field absent in that
      // case, so $ifNull pins it to null and the return type stays honest.
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $unset: ['owner.password'] },
      { $set: { owner: { $ifNull: ['$owner', null] } } },
    ])
    .toArray();

  return result ?? null;
}

/** True when a token with that hash existed to revoke. */
export async function revokeRefreshTokenByHash(tokenHash: string): Promise<boolean> {
  const now = new Date();
  const result = await refreshTokensCollection().updateOne(
    { tokenHash },
    { $set: { revokedAt: now, updatedAt: now } }
  );

  return result.matchedCount > 0;
}
