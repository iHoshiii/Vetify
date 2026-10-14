import { NATIVE_CLIENT_ID, NATIVE_REDIRECT_URI, nativeExchangeSchema } from '@shared/native-auth';
import { z } from 'zod';
import { apiFetch } from './api';

const handoffResponse = z.object({
  url: z.string().url(),
  expiresAt: z.string().datetime(),
  user: z.object({ id: z.string().min(1), name: z.string().nullable(), email: z.string() }),
});
export type NativeHandoff = z.infer<typeof handoffResponse>;

export async function createNativeHandoff(): Promise<NativeHandoff> {
  const parsed = handoffResponse.safeParse(
    await apiFetch('/auth/native/handoff', {
      method: 'POST',
      body: { clientId: NATIVE_CLIENT_ID, redirectUri: NATIVE_REDIRECT_URI },
    })
  );
  if (!parsed.success) throw new Error('The account connection could not be created. Try again.');
  const response = parsed.data;
  const url = new URL(response.url);
  if (
    `${url.protocol}//${url.host}${url.pathname}` !== NATIVE_REDIRECT_URI ||
    url.username ||
    url.password ||
    url.hash ||
    Array.from(url.searchParams).length !== 1
  ) {
    throw new Error('The account connection could not be created. Try again.');
  }
  const exchange = nativeExchangeSchema.safeParse({
    clientId: NATIVE_CLIENT_ID,
    redirectUri: NATIVE_REDIRECT_URI,
    code: url.searchParams.get('code'),
  });
  if (!exchange.success) throw new Error('The account connection could not be created. Try again.');
  return response;
}
