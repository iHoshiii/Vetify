// Optional joint acceptance: requires the sibling vetify-blogs checkout and its dependencies.
// Uses disposable MongoDB only; never loads private environment files.
import { generateKeyPairSync } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

Object.assign(process.env, {
  NODE_ENV: 'test',
  JWT_SECRET_ACCESS: 'synthetic-joint-signing-secret-at-least-32-characters',
  MAIL_TRANSPORT: 'log',
  AUTH_MAIL_TRANSPORT: 'log',
});
const { connectDb, disconnectDb } = await import('../src/server/config/db');
const { env } = await import('../src/server/config/env');
const { ensureIndexes } = await import('../src/server/models');
const { insertUser, usersCollection } = await import('../src/server/models/users');
const { professionalsCollection } = await import('../src/server/models/professionals');
const { createApp: mainApp } = await import('../src/server/app');
const { createApp: blogApp } = await import('../../vetify-blogs/src/server/app');
const { parseConfig } = await import('../../vetify-blogs/src/server/config');
const { connectDatabase } = await import('../../vetify-blogs/src/server/data/database');
const { Store } = await import('../../vetify-blogs/src/server/data/store');
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
let server: Server | undefined;
let blogConnection: Awaited<ReturnType<typeof connectDatabase>> | undefined;
try {
  await connectDb(mongo.getUri('main_joint'));
  await ensureIndexes();
  server = createServer();
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const origin = `http://127.0.0.1:${address.port}`;
  env.SERVER_URL = origin;
  const secret = 'synthetic-joint-blog-client-secret-32-characters';
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  Object.assign(process.env, {
    OIDC_ISSUER: `${origin}/api/oidc`,
    OIDC_ANATOMY_CLIENT_SECRET: 'synthetic-joint-anatomy-secret-32-characters',
    OIDC_BLOG_CLIENT_SECRET: secret,
    OIDC_COOKIE_KEYS: JSON.stringify(['synthetic-joint-cookie-key-32-characters']),
    OIDC_JWKS: JSON.stringify({
      keys: [{ ...privateKey.export({ format: 'jwk' }), kid: 'joint', alg: 'RS256', use: 'sig' }],
    }),
  });
  server.on('request', mainApp());
  blogConnection = await connectDatabase(mongo.getUri('blog_joint'));
  const config = parseConfig({
    NODE_ENV: 'test',
    MONGODB_URI: mongo.getUri('blog_joint'),
    MAIN_AUTH_ORIGIN: origin,
    AUTH_CLIENT_SECRET: secret,
    AUTH_ENABLED: 'true',
    AUTH_SESSION_KEY: '55'.repeat(32),
  });
  const app = blogApp(config, new Store(blogConnection.db, blogConnection.client), {
    screen: async () => ({
      outcome: 'clean',
      categories: [],
      severity: 0,
      terms: [],
      notes: null,
      model: 'joint-fixture',
    }),
  });
  const user = await insertUser({
    email: 'joint-blog@example.com',
    password: 'Sup3rSecret!',
    name: 'Joint Author',
    emailVerified: true,
    provider: 'local',
  });
  await usersCollection().updateOne({ _id: user._id }, { $set: { role: 'professional' } });
  await professionalsCollection().insertOne({ user: user._id, status: 'verified' } as never);
  const browser = request.agent(origin);
  assert.equal(
    (await browser.post('/api/v1/auth/login').send({ email: user.email, password: 'Sup3rSecret!' }))
      .status,
    200
  );
  async function signIn(returnTo = '/write') {
    const login = await request(app).get('/api/v1/auth/login').query({ returnTo });
    assert.equal(login.status, 302);
    let destination = new URL(login.headers.location);
    for (let step = 0; step < 8 && destination.origin === origin; step++) {
      const response = await browser.get(destination.pathname + destination.search);
      assert.ok(response.headers.location, 'Main must redirect');
      destination = new URL(response.headers.location, origin);
    }
    assert.equal(destination.origin, 'http://localhost:5178');
    assert.ok(destination.searchParams.get('code'));
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    const callback = await request(app)
      .post('/api/v1/auth/callback')
      .set('Origin', config.CLIENT_ORIGIN)
      .set('Cookie', cookie)
      .send({ search: destination.search });
    assert.equal(callback.status, 200, JSON.stringify(callback.body));
    assert.equal(callback.body.data.returnTo, returnTo);
    return (callback.headers['set-cookie'] as unknown as string[])
      .find((c) => c.startsWith('blog_session='))!
      .split(';')[0];
  }
  const cookie = await signIn();
  const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
  assert.equal(me.status, 200, JSON.stringify(me.body));
  assert.equal(me.body.data.id, user._id.toHexString());
  assert.equal(me.body.data.canAuthor, true);
  const input = {
    title: 'Joint integration article',
    excerpt: 'A synthetic article for isolated verification.',
    body: 'Discuss changes in animal health with a qualified veterinarian. '.repeat(5),
    tags: ['care'],
    status: 'published',
  };
  const post = await request(app)
    .post('/api/v1/blogs')
    .set('Origin', config.CLIENT_ORIGIN)
    .set('Cookie', cookie)
    .send(input);
  assert.equal(post.status, 201, JSON.stringify(post.body));
  assert.equal(post.body.data.status, 'published');
  await professionalsCollection().updateOne({ user: user._id }, { $set: { status: 'suspended' } });
  assert.equal(
    (
      await request(app)
        .post('/api/v1/blogs')
        .set('Origin', config.CLIENT_ORIGIN)
        .set('Cookie', cookie)
        .send(input)
    ).status,
    403
  );
  await usersCollection().updateOne({ _id: user._id }, { $set: { role: 'admin' } });
  assert.equal((await request(app).get('/api/v1/admin/blogs').set('Cookie', cookie)).status, 200);
  await usersCollection().updateOne({ _id: user._id }, { $set: { role: 'user' } });
  assert.equal((await request(app).get('/api/v1/admin/blogs').set('Cookie', cookie)).status, 403);
  assert.equal(
    (
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Origin', config.CLIENT_ORIGIN)
        .set('Cookie', cookie)
        .send({})
    ).status,
    200
  );
  assert.equal((await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status, 401);
  assert.equal((await browser.post('/api/v1/auth/refresh')).status, 200);
  const next = await signIn('/admin');
  assert.equal(
    (await browser.post('/api/v1/auth/logout-all').set('Origin', env.CLIENT_ORIGIN)).status,
    200
  );
  assert.equal((await request(app).get('/api/v1/auth/me').set('Cookie', next)).status, 401);
  console.log(
    'JOINT PASS: real Main provider + real Blog client, seamless sign-in, destination return, publishing, approval revocation, admin demotion, local logout isolation and global logout. Disposable databases only.'
  );
} finally {
  await blogConnection?.client.close();
  if (server)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve()))
    );
  await disconnectDb();
  await mongo.stop();
}
