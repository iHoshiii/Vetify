import express from 'express';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env', () => ({ env: { NODE_ENV: 'development' } }));
const files = vi.hoisted(() => ({ appendFile: vi.fn() }));
vi.mock('node:fs/promises', () => files);

import { env } from '../../config/env';
import { nativeAuthDiagnostics } from '../native-auth-diagnostics';

const loginPath = '/api/v1/auth/native/login';
let server: Server | undefined;

function testApp() {
  const app = express();
  app.use(nativeAuthDiagnostics);
  app.use(express.json());
  app.post(loginPath, (_req, res) => res.status(401).json({ reason: 'account-not-found' }));
  app.post('/api/v1/auth/native/signup', (_req, res) => res.status(201).json({ ok: true }));
  app.use((_req, res) => res.status(404).end());
  return app;
}

function logs() {
  return vi.mocked(console.info).mock.calls.flat().join('\n');
}

beforeEach(() => {
  env.NODE_ENV = 'development';
  files.appendFile.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(async () => {
  await vi.waitFor(() =>
    expect(files.appendFile).toHaveBeenCalledTimes(vi.mocked(console.info).mock.calls.length)
  );
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
  }
  vi.restoreAllMocks();
});

describe('Native account development diagnostics', () => {
  it.each([
    [loginPath, 401],
    ['/api/v1/auth/native/signup', 201],
  ])('reports arrival and HTTP completion for %s', async (path, status) => {
    const response = await request(testApp()).post(path).send({});
    expect(response.status).toBe(status);
    expect(console.info).toHaveBeenCalledTimes(2);
    expect(logs()).toMatch(/\[native-auth\] #\d+ POST .* received/);
    expect(logs()).toMatch(new RegExp(`finished HTTP ${status} in \\d+ms`));
    await vi.waitFor(() => expect(files.appendFile).toHaveBeenCalledTimes(2));
    expect(files.appendFile.mock.calls[0][1]).toMatch(/pid=\d+ .* received\n$/);
    expect(files.appendFile.mock.calls[1][1]).toContain(`finished HTTP ${status}`);
    expect(files.appendFile.mock.calls[0][0]).toBe('native-auth-dev.log');
  });

  it('excludes query parameters, credentials, and request headers', async () => {
    await request(testApp())
      .post(`${loginPath}?token=secret-query`)
      .set('Authorization', 'Bearer secret-header')
      .send({ email: 'private@example.test', password: 'secret-password' });
    await vi.waitFor(() => expect(files.appendFile).toHaveBeenCalledTimes(2));
    const output = logs() + files.appendFile.mock.calls.flat().join('\n');
    expect(output).toContain(`POST ${loginPath} received`);
    for (const secret of [
      'secret-query',
      'secret-header',
      'secret-password',
      'private@example.test',
    ]) {
      expect(output).not.toContain(secret);
    }
  });

  it.each(['production', 'test'] as const)('stays silent in %s', async (mode) => {
    env.NODE_ENV = mode;
    await request(testApp()).post(loginPath).send({});
    expect(console.info).not.toHaveBeenCalled();
    expect(files.appendFile).not.toHaveBeenCalled();
  });

  it('does not report other methods or unknown paths', async () => {
    await request(testApp()).get(loginPath);
    await request(testApp()).post('/api/v1/auth/native/private-secret').send({});
    expect(console.info).not.toHaveBeenCalled();
  });

  it('reports arrival before JSON parsing and an interrupted incomplete upload', async () => {
    server = testApp().listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const port = (server.address() as AddressInfo).port;
    const upload = httpRequest({
      hostname: '127.0.0.1',
      port,
      path: loginPath,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': 100 },
    });
    upload.on('error', () => {});
    upload.flushHeaders();
    try {
      await vi.waitFor(() => expect(logs()).toContain('received'));
      expect(console.info).toHaveBeenCalledTimes(1);
      upload.destroy();
      await vi.waitFor(() => expect(logs()).toContain('interrupted'));
      expect(console.info).toHaveBeenCalledTimes(2);
      expect(logs()).toContain('bodyComplete=false');
      expect(logs()).not.toContain('finished HTTP');
    } finally {
      upload.destroy();
    }
  });

  it('does not affect authentication when the local log cannot be written', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    files.appendFile.mockRejectedValue(new Error('private filesystem detail'));
    const response = await request(testApp()).post(loginPath).send({});
    expect(response.status).toBe(401);
    await vi.waitFor(() => expect(files.appendFile).toHaveBeenCalledTimes(2));
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(
      '[native-auth] Could not write the local development diagnostic log.'
    );
    expect(logs()).not.toContain('private filesystem detail');
  });
});
