import crypto from 'node:crypto';
import type { CookieOptions } from 'express';
import { z } from 'zod';
import { ACCOUNT_LINK_METHODS, type AccountLinkMethod } from '@shared/account-auth';
import { env, isProduction } from '../config/env';
import { accountLinkVerifications } from '../models/account-link-verification';
import { ObjectId } from 'mongodb';
import { AppError } from '../utils/AppError';
import type { User } from '../models/users';

export const ACCOUNT_LINK_PROOF_COOKIE = 'account_link_email_proof';
export const ACCOUNT_LINK_TTL_MS = 5 * 60 * 1000;
export const accountLinkCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/api/v1',
  maxAge: ACCOUNT_LINK_TTL_MS,
};
const schema = z.object({
  userId: z.string().regex(/^[a-f0-9]{24}$/),
  sourceTokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  email: z.string().email(),
  method: z.enum(ACCOUNT_LINK_METHODS),
  generation: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.number().positive(),
});
export type AccountLinkProof = z.infer<typeof schema>;
const signature = (encoded: string) =>
  crypto
    .createHmac('sha256', env.OAUTH_STATE_SECRET ?? env.JWT_SECRET_ACCESS)
    .update(`account-link-email.${encoded}`)
    .digest('base64url');
export function sealAccountLinkProof(proof: AccountLinkProof) {
  const encoded = Buffer.from(JSON.stringify(proof)).toString('base64url');
  return `${encoded}.${signature(encoded)}`;
}
export function unsealAccountLinkProof(raw: unknown): AccountLinkProof | null {
  if (typeof raw !== 'string') return null;
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [encoded, signed] = parts;
  if (!encoded || !signed || signed.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(signed)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signed), Buffer.from(signature(encoded)))) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(Buffer.from(encoded, 'base64url').toString()));
    return parsed.success && parsed.data.expiresAt > Date.now() ? parsed.data : null;
  } catch {
    return null;
  }
}
export function accountLinkProofFilter(proof: AccountLinkProof) {
  return {
    _id: new ObjectId(proof.userId),
    email: proof.email,
    method: proof.method,
    sourceTokenHash: proof.sourceTokenHash,
    generation: proof.generation,
    verifiedAt: { $ne: null },
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  };
}
export async function requireAccountLinkProof(
  user: User,
  sourceTokenHash: string,
  method: AccountLinkMethod,
  raw: unknown
) {
  const proof = unsealAccountLinkProof(raw);
  if (
    !proof ||
    proof.userId !== user._id.toHexString() ||
    proof.email !== user.email ||
    proof.sourceTokenHash !== sourceTokenHash ||
    proof.method !== method ||
    !(await accountLinkVerifications().findOne(accountLinkProofFilter(proof)))
  ) {
    throw AppError.forbidden(
      'Verify the code sent to your email before linking this sign-in method.',
      'email-link-required'
    );
  }
  return proof;
}
export async function consumeAccountLinkProof(proof: AccountLinkProof) {
  const result = await accountLinkVerifications().updateOne(accountLinkProofFilter(proof), {
    $set: { consumedAt: new Date() },
  });
  if (!result.modifiedCount)
    throw AppError.forbidden(
      'Your email confirmation expired. Please request another code.',
      'email-link-required'
    );
}
export async function rotateAccountLinkProof(
  raw: unknown,
  userId: string,
  fromHash: string,
  toHash: string
) {
  await accountLinkVerifications().updateOne(
    {
      _id: new ObjectId(userId),
      sourceTokenHash: fromHash,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { sourceTokenHash: toHash } }
  );
  const proof = unsealAccountLinkProof(raw);
  if (!proof || proof.userId !== userId || proof.sourceTokenHash !== fromHash) return null;
  return {
    cookie: sealAccountLinkProof({ ...proof, sourceTokenHash: toHash }),
    expiresAt: proof.expiresAt,
  };
}
