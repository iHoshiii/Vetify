import { ObjectId, type Collection } from 'mongodb';
import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { USERS_COLLECTION } from '../users';
import {
  REFRESH_TOKENS_COLLECTION,
  type RefreshTokenDocument,
  type RefreshTokenWithOwner,
} from './types';

// connects to the 'refreshtokens' collection
export function refreshTokensCollection(): Collection<RefreshTokenDocument> {
  return getDb().collection<RefreshTokenDocument>(REFRESH_TOKENS_COLLECTION);
}

// passes the attrs to the insertRefreshToken function
export async function insertRefreshToken(attrs: {
  tokenHash: string;
  user: string | ObjectId;
  expiresAt: Date;
}): Promise<RefreshTokenDocument> {
  const now = new Date();
  // create new refresh token document with the provided fields
  const doc: RefreshTokenDocument = {
    _id: new ObjectId(),
    tokenHash: attrs.tokenHash,
    user: toObjectId(attrs.user),
    expiresAt: attrs.expiresAt,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  // wait for the reshresh token document to be inserted into the collection and return the document
  await refreshTokensCollection().insertOne(doc);
  return doc;
}

// find the refresh token document by the provided token hash and return it or null if not found
export function findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
  return refreshTokensCollection().findOne({ tokenHash });
}

// passes the token hash to the findRefreshTokenWithOwner
export async function findRefreshTokenWithOwner(
  tokenHash: string
): Promise<RefreshTokenWithOwner | null> {
  //  find the one token hash that matches the provided token hash
  const [result] = await refreshTokensCollection()
    .aggregate<RefreshTokenWithOwner>([
      { $match: { tokenHash } }, // tokenHash is unique, so this only ever removes work from the join.
      { $limit: 1 },
      {
        $lookup: {
          from: USERS_COLLECTION, // look inside this collection
          localField: 'user', // looking for the value that is the same with the local field
          foreignField: '_id', // check and find in the the USER_COLLECTIONS _id field
          as: 'owner', // create a new field called owner and store the result of the lookup in it
        },
      },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } }, // flattens the array
      { $unset: ['owner.password'] }, // remove the password field from the owner field
      { $set: { owner: { $ifNull: ['$owner', null] } } }, // if the owner field is null leave it as null, otherwise set it to the owner field
    ])
    .toArray(); // converts the document into standard JS array
  return result ?? null;
}

// update the tokenHash to  the current day
export async function revokeRefreshTokenByHash(tokenHash: string): Promise<boolean> {
  const now = new Date();
  const result = await refreshTokensCollection().updateOne(
    { tokenHash },
    { $set: { revokedAt: now, updatedAt: now } }
  );
  return result.matchedCount > 0;
}

/**
 * Kills every live session for one account and reports how many it closed.
 *
 * Suspending or banning a user has to come through here. Their access token stays
 * valid for up to ACCESS_TOKEN_MINUTES, which requireRole catches on the next
 * request — but the refresh cookie is good for REFRESH_TOKEN_DAYS, so without
 * this the blocked account simply mints itself a fresh token and carries on.
 *
 * Already-revoked tokens are excluded from the filter so the count reflects
 * sessions actually closed by this call, and re-running it is a no-op.
 */
export async function revokeAllRefreshTokensForUser(userId: string | ObjectId): Promise<number> {
  const now = new Date();
  const result = await refreshTokensCollection().updateMany(
    { user: toObjectId(userId), revokedAt: null },
    { $set: { revokedAt: now, updatedAt: now } }
  );
  return result.modifiedCount;
}
