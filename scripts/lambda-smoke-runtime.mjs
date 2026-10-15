import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import { MongoClient, ObjectId } from 'mongodb';

const frames = [];
const server = createServer((request, response) => {
  let body = '';
  request.on('data', (part) => {
    body += part;
  });
  request.on('end', () => {
    frames.push({
      method: request.method,
      path: request.url,
      body: body ? JSON.parse(body) : null,
    });
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{}');
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
process.env.REALTIME_MANAGEMENT_ENDPOINT = `http://127.0.0.1:${server.address().port}/prod`;
const dbClient = new MongoClient(process.env.MONGODB_URI);
let worker;
try {
  const { handler: http } = await import('./http.js');
  const { handler: websocket } = await import('./websocket.js');
  const { handler: maintenance } = await import('./maintenance.js');
  const context = () => ({ callbackWaitsForEmptyEventLoop: true });
  const invoke = (path, body, token) =>
    http(
      {
        version: '2.0',
        routeKey: 'ANY /{proxy+}',
        rawPath: path,
        rawQueryString: '',
        headers: {
          host: 'api.test',
          'content-type': 'application/json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
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
      },
      context(),
      () => undefined
    );
  const signup = await invoke('/api/v1/auth/signup', {
    name: 'Smoke Test',
    email: 'smoke@test.invalid',
    password: 'TestPass123!',
    confirmPassword: 'TestPass123!',
  });
  assert.equal(signup.statusCode, 200);
  console.log('[lambda smoke] HTTP signup and startup passed');
  const auth = JSON.parse(signup.body);
  assert.ok(signup.cookies?.some((cookie) => cookie.startsWith('refresh_token=')));
  await dbClient.connect();
  await dbClient
    .db()
    .collection('users')
    .updateOne({ _id: new ObjectId(auth.user.id) }, { $set: { emailVerified: true } });
  const ticket = await invoke(
    '/api/v1/account/realtime-ticket',
    { clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    auth.accessToken
  );
  assert.equal(ticket.statusCode, 200);
  const route = (routeKey) => ({ requestContext: { routeKey, connectionId: 'smoke-connection' } });
  assert.equal(
    (
      await websocket(
        {
          ...route('$connect'),
          headers: { origin: 'https://vetify.page' },
          queryStringParameters: { ticket: JSON.parse(ticket.body).ticket },
        },
        context()
      )
    ).statusCode,
    200
  );
  assert.equal(
    (
      await websocket(
        {
          ...route('$default'),
          body: JSON.stringify({ event: 'connection:ready', requestId: 'ready' }),
        },
        context()
      )
    ).statusCode,
    200
  );
  assert.ok(frames.some((frame) => frame.body?.requestId === 'ready' && frame.body.payload.ok));
  assert.ok(frames.some((frame) => frame.body?.event === 'presence:snapshot'));
  console.log('[lambda smoke] SDK delivery to local gateway passed');
  await dbClient
    .db()
    .collection('realtimeconnections')
    .updateOne({ _id: 'smoke-connection' }, { $set: { expiresAt: Date.now() - 1 } });
  await maintenance({}, context());
  assert.ok(frames.some((frame) => frame.method === 'DELETE'));
  worker = new Worker(new URL('./book-pdf.worker.js', import.meta.url), {
    workerData: new Uint8Array(await readFile(new URL('./fixture.pdf', import.meta.url))),
  });
  const parsed = await new Promise((resolve, reject) => {
    worker.once('message', resolve);
    worker.once('error', reject);
  });
  assert.match(parsed.pages[0], /Veterinary PDF smoke test/);
  await worker.terminate();
  await dbClient.close();
  server.close();
  process.exit(0);
} catch (error) {
  console.error(error);
  await worker?.terminate();
  await dbClient.close();
  server.close();
  process.exit(1);
}
