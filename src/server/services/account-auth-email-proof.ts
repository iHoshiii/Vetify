import type { User } from '../models/users';
import { AppError } from '../utils/AppError';
import { accountIdentities } from './account-auth-identities';
import { unsealPasswordProof } from './account-auth-proof';
import { requireAccountLinkProof } from './account-link-proof';

async function validLegacyProof(user: User, sourceTokenHash: string, rawProof: unknown) {
  const proof = unsealPasswordProof(rawProof);
  if (
    !proof ||
    proof.userId !== user._id.toHexString() ||
    proof.sourceTokenHash !== sourceTokenHash ||
    proof.email !== user.email
  )
    return false;
  const identities = await accountIdentities(user);
  return identities.some(
    (identity) => identity.provider === proof.provider && identity.providerId === proof.providerId
  );
}
export async function passwordEmailReady(user: User, hash: string, raw: unknown, legacy: unknown) {
  try {
    await requireAccountLinkProof(user, hash, 'local', raw);
    return legacy === undefined || (await validLegacyProof(user, hash, legacy));
  } catch (error) {
    if (error instanceof AppError && error.reason === 'email-link-required') return false;
    throw error;
  }
}
