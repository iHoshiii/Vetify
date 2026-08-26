import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../../config/env';
import { MailError, clearRecentMail, recentMail, sendMail } from '../mail.service';

const TRANSPORT = env.MAIL_TRANSPORT;
const API_KEY = env.MAIL_API_KEY;

function message(overrides: Partial<Parameters<typeof sendMail>[0]> = {}) {
  return {
    to: 'vet@example.com',
    subject: 'Your Vetify application link',
    text: 'Open https://vetify.test/apply/abc to finish your application.',
    ...overrides,
  };
}

/** The url and options fetch was called with, typed for the assertions below. */
function postedTo(fetchMock: ReturnType<typeof vi.fn>): [string, RequestInit] {
  return fetchMock.mock.calls[0] as [string, RequestInit];
}

/** The JSON body the provider was handed, as the provider would parse it. */
function postedBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
  return JSON.parse(String(init.body)) as Record<string, unknown>;
}

beforeEach(() => {
  clearRecentMail();
});

afterEach(() => {
  env.MAIL_TRANSPORT = TRANSPORT;
  env.MAIL_API_KEY = API_KEY;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('the log transport', () => {
  it('records the message and reaches no network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    env.MAIL_TRANSPORT = 'log';

    await sendMail(message());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(recentMail()).toHaveLength(1);
    expect(recentMail()[0]?.text).toContain('https://vetify.test/apply/abc');
  });

  it('keeps only the last twenty messages', async () => {
    env.MAIL_TRANSPORT = 'log';

    for (let index = 0; index < 23; index += 1) {
      await sendMail(message({ subject: `Message ${index}` }));
    }

    expect(recentMail()).toHaveLength(20);
    expect(recentMail()[0]?.subject).toBe('Message 3');
    expect(recentMail().at(-1)?.subject).toBe('Message 22');
  });
});

describe('the http transport', () => {
  beforeEach(() => {
    env.MAIL_TRANSPORT = 'http';
    env.MAIL_API_KEY = 'key-123';
  });

  it('posts the provider body shape behind a bearer token', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'sent' })));
    vi.stubGlobal('fetch', fetchMock);

    await sendMail(message({ html: '<p>Open the link</p>' }));

    const [url, init] = postedTo(fetchMock);
    expect(url).toBe(env.MAIL_API_URL);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer key-123');
    expect(postedBody(fetchMock)).toEqual({
      from: env.MAIL_FROM,
      to: ['vet@example.com'],
      subject: 'Your Vetify application link',
      text: 'Open https://vetify.test/apply/abc to finish your application.',
      html: '<p>Open the link</p>',
    });
  });

  it('leaves html out entirely when the message has none', async () => {
    const fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    await sendMail(message());

    expect(postedBody(fetchMock)).not.toHaveProperty('html');
  });

  it('refuses to send without a key, before opening a socket', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    env.MAIL_API_KEY = undefined;

    await expect(sendMail(message())).rejects.toThrow(MailError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports what the provider said when it refuses the message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('domain not verified', { status: 403 }))
    );

    await expect(sendMail(message())).rejects.toThrow(/403 domain not verified/);
  });

  it('reports a provider that never answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('socket hang up');
      })
    );

    await expect(sendMail(message())).rejects.toThrow(/did not answer: socket hang up/);
  });

  it('keeps the attempt in the outbox even when delivery fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 }))
    );

    await expect(sendMail(message())).rejects.toThrow(MailError);
    expect(recentMail()).toHaveLength(1);
  });
});
