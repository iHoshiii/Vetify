import { ACCOUNT_AUTH_PROVIDERS, accountAuthContextSchema } from '@shared/account-auth';
import crypto from 'node:crypto';
import type { CookieOptions } from 'express';
import { z } from 'zod';

import { env, isProduction } from '../config/env';

export const PASSWORD_PROOF_COOKIE = 'account_password_proof';
export const PASSWORD_PROOF_TTL_MS = 5 * 60 * 1000;
export const passwordProofCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  maxAge: PASSWORD_PROOF_TTL_MS,
  path: '/api/v1',
};

const proofSchema = accountAuthContextSchema.extend({
  purpose: z.literal('add-password'),
  provider: z.enum(ACCOUNT_AUTH_PROVIDERS),
  providerId: z.string().min(1),
  email: z.string().email(),
  expiresAt: z.number().int().positive(),
});
export type PasswordProof = z.infer<typeof proofSchema>;

function sign(encoded: string): string {
  return crypto
    .createHmac('sha256', env.OAUTH_STATE_SECRET ?? env.JWT_SECRET_ACCESS)
    .update(`account-password-proof.${encoded}`)
    .digest('base64url');
}

export function sealPasswordProof(
  input: Omit<PasswordProof, 'expiresAt'> & { expiresAt?: number }
): string {
  const payload = { ...input, expiresAt: input.expiresAt ?? Date.now() + PASSWORD_PROOF_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function unsealPasswordProof(raw: unknown): PasswordProof | null {
  if (typeof raw !== 'string') return null;
  const separator = raw.lastIndexOf('.');
  if (separator <= 0) return null;
  const encoded = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  if (signature.length !== 43 || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sign(encoded)))) return null;
  try {
    const parsed = proofSchema.safeParse(JSON.parse(Buffer.from(encoded, 'base64url').toString()));
    if (!parsed.success || parsed.data.expiresAt <= Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function rotatePasswordProof(
  raw: unknown,
  userId: string,
  fromHash: string,
  toHash: string
) {
  const proof = unsealPasswordProof(raw);
  if (!proof || proof.userId !== userId || proof.sourceTokenHash !== fromHash) return null;
  return {
    cookie: sealPasswordProof({ ...proof, sourceTokenHash: toHash }),
    expiresAt: proof.expiresAt,
  };
}
