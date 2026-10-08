import request from 'supertest';
import { createApp } from '../../../app';
import { NATIVE_CLIENT_ID, NATIVE_REDIRECT_URI } from '../../../../shared/native-auth';
import { env } from '../../../config/env';
import { nativeHandoffsCollection } from '../../../models/native-handoff';
import { hashToken } from '../../../models/refresh-token';
import { insertUser } from '../../../models/users';

export const app = createApp();
export const CLIENT = { clientId: NATIVE_CLIENT_ID, redirectUri: NATIVE_REDIRECT_URI };
export const CREDENTIALS = { email: 'mobile@example.com', password: 'Sup3rSecret!' };
export async function browserSession() {
  const user = await insertUser({ ...CREDENTIALS, name: 'Mobile Owner', provider: 'local' });
  const browser = request.agent(app);
  const login = await browser.post('/api/v1/auth/login').send(CREDENTIALS);
  const cookies = login.headers['set-cookie'] as unknown as string[];
  const cookie = cookies.find((entry) => entry.startsWith(`${env.REFRESH_COOKIE_NAME}=`))!;
  const rawRefresh = cookie.split(';')[0].split('=')[1];
  return { user, browser, accessToken: login.body.accessToken as string, rawRefresh };
}
export async function connectionCode(browser: request.Agent) {
  const handoff = await browser.post('/api/v1/auth/native/handoff').send(CLIENT);
  return { handoff, code: new URL(handoff.body.url as string).searchParams.get('code')! };
}
export const exchange = (code: string) =>
  request(app)
    .post('/api/v1/auth/native/exchange')
    .send({ ...CLIENT, code });
export const introspect = (accessToken: string) =>
  request(app).post('/api/v1/auth/introspect').set('Authorization', `Bearer ${accessToken}`);
export const nativeRefresh = (refreshToken: string) =>
  request(app).post('/api/v1/auth/native/refresh').send({ refreshToken });
export const nativeLogout = (refreshToken: string) =>
  request(app).post('/api/v1/auth/native/logout').send({ refreshToken });
export async function expireCode(code: string) {
  await nativeHandoffsCollection().updateOne(
    { codeHash: hashToken(code) },
    { $set: { expiresAt: new Date(Date.now() - 1) } }
  );
}
