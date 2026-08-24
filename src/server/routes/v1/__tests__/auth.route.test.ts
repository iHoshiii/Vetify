import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../../app';
import { env } from '../../../config/env';
import { refreshTokensCollection } from '../../../models/refresh-token';
import { insertUser, updateUser, type UserStatus } from '../../../models/users';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

const app = createApp();

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const CREDENTIALS = { email: 'ada@example.com', password: 'Sup3rSecret!' };

async function makeAccount() {
  return insertUser({ ...CREDENTIALS, name: 'Ada', provider: 'local' });
}

const login = (agent: request.Agent) => agent.post('/api/v1/auth/login').send(CREDENTIALS);

describe('POST /api/v1/auth/login', () => {
  it('issues a token carrying the role claim', async () => {
    await makeAccount();
    const res = await login(request.agent(app));

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('user');

    // The claim has to be in the token too, not only in the response body: the
    // client reads the body, the server reads the token.
    const [, payload] = (res.body.accessToken as string).split('.');
    expect(JSON.parse(Buffer.from(payload, 'base64url').toString()).role).toBe('user');
  });

  it.each(['suspended', 'banned'] as const)('refuses a %s account', async (status) => {
    const user = await makeAccount();
    await updateUser(user._id, { status });

    const res = await login(request.agent(app));

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe(`account-${status}`);
    expect(res.body.accessToken).toBeUndefined();
  });

  it('still answers 401 for a wrong password on a suspended account', async () => {
    // Status is checked after the password so the response cannot be used to
    // work out which addresses have accounts.
    const user = await makeAccount();
    await updateUser(user._id, { status: 'suspended' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ ...CREDENTIALS, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.reason).toBeUndefined();
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('mints a fresh access token for an active account', async () => {
    await makeAccount();
    const agent = request.agent(app);
    await login(agent);

    const res = await agent.post('/api/v1/auth/refresh');

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('user');
  });

  it('refuses to refresh once the account is blocked, and revokes the token', async () => {
    const user = await makeAccount();
    const agent = request.agent(app);
    await login(agent);

    // Straight to the document, so this covers the backstop rather than the
    // revocation the admin route performs alongside it.
    await updateUser(user._id, { status: 'banned' as UserStatus });

    const res = await agent.post('/api/v1/auth/refresh');

    expect(res.status).toBe(403);
    expect(res.body.reason).toBe('account-banned');

    const live = await refreshTokensCollection().countDocuments({
      user: user._id,
      revokedAt: null,
    });
    expect(live).toBe(0);

    const cleared = (res.headers['set-cookie'] as unknown as string[]).some((c) =>
      c.startsWith(`${env.REFRESH_COOKIE_NAME}=;`)
    );
    expect(cleared).toBe(true);
  });
});
