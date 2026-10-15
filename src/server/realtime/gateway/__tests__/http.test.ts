import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { env } from '../../../config/env';
import { insertUser } from '../../../models/users';
import { insertThread } from '../../../models/messages';
import { handler } from '../../../lambda/http';
import { setupGateway, tokenFor, connect, received } from './fixtures';

vi.mock('../../../lambda/runtime', () => ({ initializeLambda: async () => undefined }));
setupGateway();
const originalEndpoint = env.REALTIME_MANAGEMENT_ENDPOINT;
beforeEach(() => {
  env.REALTIME_MANAGEMENT_ENDPOINT = 'https://gateway.test/prod';
});
afterEach(() => {
  env.REALTIME_MANAGEMENT_ENDPOINT = originalEndpoint;
});

function request(path: string, token: string, body: unknown) {
  return {
    version: '2.0',
    routeKey: 'ANY /{proxy+}',
    rawPath: path,
    rawQueryString: '',
    headers: {
      host: 'api.test',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    requestContext: {
      apiId: 'test',
      domainName: 'api.test',
      stage: '$default',
      requestId: 'test',
      timeEpoch: Date.now(),
      http: {
        method: 'POST',
        path,
        sourceIp: '127.0.0.1',
        protocol: 'HTTP/1.1',
        userAgent: 'test',
      },
    },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}
const context = () => ({ callbackWaitsForEmptyEventLoop: true } as Parameters<typeof handler>[1]);
describe('Lambda HTTP integration', () => {
  it('issues browser tickets through an API Gateway HTTP v2 request', async () => {
    const user = await insertUser({ email: 'http@test.invalid', provider: 'google' });
    const result = await handler(
      request('/api/v1/account/realtime-ticket', tokenFor(user), {
        clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      }),
      context(),
      () => undefined
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).ticket).toMatch(/^[a-f0-9]{64}$/);
  });
  it('persists a chat message and waits for gateway notification delivery', async () => {
    const user = await insertUser({ email: 'sender@test.invalid', provider: 'google' });
    const vet = await insertUser({
      email: 'receiver@test.invalid',
      provider: 'google',
      role: 'professional',
    });
    const id = await connect(vet);
    const thread = await insertThread({
      client: user._id,
      professionalUser: vet._id,
      professional: new ObjectId(),
    });
    const result = await handler(
      request(`/api/v1/messages/${thread._id}/messages`, tokenFor(user), {
        body: 'Hello from Lambda',
      }),
      context(),
      () => undefined
    );
    expect(result.statusCode).toBe(201);
    expect(received(id, 'thread:message')).toHaveLength(1);
  });
});
