import type { Request } from 'express';
import { nativeSocialContextSchema, type NativeSocialContext } from '../../shared/native-auth';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { OAuthProviderName } from './oauth.service';

const QUERY_FIELDS = {
  clientId: 'nativeClientId',
  redirectUri: 'nativeRedirectUri',
  state: 'nativeState',
  codeChallenge: 'nativeCodeChallenge',
} as const;

export function nativeProviderStartUrl(provider: OAuthProviderName, native: NativeSocialContext) {
  const url = new URL(`/api/v1/auth/${provider}`, env.SERVER_URL);
  for (const [field, parameter] of Object.entries(QUERY_FIELDS)) {
    url.searchParams.set(parameter, native[field as keyof NativeSocialContext]);
  }
  return url.toString();
}

export function readNativeSocialContext(req: Request): NativeSocialContext | undefined {
  if (!Object.values(QUERY_FIELDS).some((parameter) => req.query[parameter] !== undefined)) {
    return undefined;
  }
  const parsed = nativeSocialContextSchema.safeParse(
    Object.fromEntries(
      Object.entries(QUERY_FIELDS).map(([field, parameter]) => [field, req.query[parameter]])
    )
  );
  if (!parsed.success) throw AppError.badRequest('Invalid mobile sign-in request.');
  return parsed.data;
}

export function nativeSocialErrorUrl(native: NativeSocialContext, reason: string) {
  const url = new URL(native.redirectUri);
  url.searchParams.set('state', native.state);
  url.searchParams.set('error', reason);
  return url.toString();
}
