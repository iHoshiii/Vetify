import { ObjectId, MongoServerError, type IndexDescription } from 'mongodb';

import { getDb } from '../config/db';
import { AppError } from '../utils/AppError';
import { findUserById, findUserByProviderId, type AuthProvider } from './users';

export type SocialAuthProvider = Exclude<AuthProvider, 'local'>;
export const AUTH_IDENTITIES_COLLECTION = 'authidentities';
export const AUTH_IDENTITY_INDEXES: IndexDescription[] = [
  { key: { provider: 1, providerId: 1 }, unique: true },
  { key: { user: 1, provider: 1 }, unique: true },
];

export type AuthIdentityDocument = {
  _id: ObjectId;
  user: ObjectId;
  provider: SocialAuthProvider;
  providerId: string;
  createdAt: Date;
};

type AuthIdentityInput = Pick<AuthIdentityDocument, 'user' | 'provider' | 'providerId'>;

export const authIdentitiesCollection = () =>
  getDb().collection<AuthIdentityDocument>(AUTH_IDENTITIES_COLLECTION);

export function findAuthIdentity(provider: SocialAuthProvider, providerId: string) {
  return authIdentitiesCollection().findOne({ provider, providerId });
}

export function listAuthIdentities(user: ObjectId) {
  return authIdentitiesCollection().find({ user }).toArray();
}

export async function insertAuthIdentity(input: AuthIdentityInput): Promise<void> {
  if (typeof input.providerId !== 'string' || !input.providerId) {
    throw AppError.badRequest('The provider did not return a valid account identity.');
  }
  const [owner, legacy] = await Promise.all([
    findUserById(input.user),
    findUserByProviderId(input.provider, input.providerId),
  ]);
  if (!owner) throw AppError.unauthorized('Your account is no longer available.');
  if (legacy && !legacy._id.equals(input.user)) {
    throw AppError.conflict(
      'This social account is already connected to another Vetify account.',
      'identity-in-use'
    );
  }
  if (
    owner.provider === input.provider &&
    owner.providerId &&
    owner.providerId !== input.providerId
  ) {
    throw AppError.conflict(
      'A different account from this provider is already connected.',
      'provider-already-linked'
    );
  }
  try {
    await authIdentitiesCollection().updateOne(
      input,
      { $setOnInsert: { ...input, _id: new ObjectId(), createdAt: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    if (!(error instanceof MongoServerError) || error.code !== 11000) throw error;
    throw AppError.conflict(
      'This sign-in method is already connected to an account.',
      'identity-in-use'
    );
  }
}
