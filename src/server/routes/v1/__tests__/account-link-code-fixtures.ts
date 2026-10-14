import { expect } from 'vitest';
import type { AccountLinkMethod } from '@shared/account-auth';
import type { BrowserSession } from './account-auth-fixtures';
import { recentMail } from '../../../services/mail.service';
import { accountLinkVerifications } from '../../../models/account-link-verification';
import { OAUTH_STATE_COOKIE, unsealState } from '../../../services/oauth-state';
import type request from 'supertest';

const BASE = '/api/v1/account/login-methods';
export const requestLinkCode = (owner: BrowserSession, method: AccountLinkMethod) =>
  owner.browser
    .post(`${BASE}/link/code`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ method });
export const verifyLinkCode = (owner: BrowserSession, method: AccountLinkMethod, code: string) =>
  owner.browser
    .post(`${BASE}/link/verify`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ method, code });
export function latestLinkCode() {
  const code = recentMail()
    .at(-1)
    ?.text.match(/\b[0-9]{6}\b/)?.[0];
  expect(code).toMatch(/^[0-9]{6}$/);
  return code!;
}
export async function emailLinkProof(owner: BrowserSession, method: AccountLinkMethod) {
  await accountLinkVerifications().updateOne(
    { _id: owner.user._id },
    { $set: { resendAvailableAt: new Date(Date.now() - 1) } }
  );
  expect((await requestLinkCode(owner, method)).status).toBe(200);
  const response = await verifyLinkCode(owner, method, latestLinkCode());
  expect(response.status).toBe(200);
  return response;
}
export function finishEmailLink(owner: BrowserSession, response: request.Response) {
  const cookies = response.headers['set-cookie'] as unknown as string[];
  const raw = cookies
    .find((cookie) => cookie.startsWith(`${OAUTH_STATE_COOKIE}=`))!
    .split(';')[0]
    .slice(OAUTH_STATE_COOKIE.length + 1);
  const state = unsealState(raw)!;
  return owner.browser
    .get(`/api/v1/auth/${state.provider}/callback`)
    .query({ state: state.state, code: 'provider-code' });
}
