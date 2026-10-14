import { describe, expect, it, vi, afterEach } from 'vitest';
import { MailError, postMailMessage, type MailProvider } from '../mail-http';

const message = { to: 'owner@example.com', subject: 'Confirmation', text: 'Your code is 012345.' };
const provider: MailProvider = {
  transport: 'http',
  apiUrl: 'https://api.resend.com/emails',
  apiKey: 're_test_key',
  from: 'Vetify <onboarding@resend.dev>',
  fromName: 'AUTH_MAIL_FROM',
  transportName: 'AUTH_MAIL_TRANSPORT',
  keyName: 'AUTH_MAIL_API_KEY',
};
afterEach(() => vi.unstubAllGlobals());

describe('transactional mail configuration checks', () => {
  it('rejects a key placed in the sender field without sending or including it in the error', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const misplacedKey = 're_misplaced_test_secret';
    const error = await postMailMessage(message, { ...provider, from: misplacedKey }).catch(
      (cause) => cause
    );
    expect(error).toBeInstanceOf(MailError);
    expect(error.message).toContain('AUTH_MAIL_FROM must be an email sender');
    expect(error.message).not.toContain(misplacedKey);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['your_api_key_here', 'owner@example.com'])(
    'rejects an invalid Resend key format without exposing it',
    async (apiKey) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      const error = await postMailMessage(message, { ...provider, apiKey }).catch((cause) => cause);
      expect(error).toBeInstanceOf(MailError);
      expect(error.message).toContain('AUTH_MAIL_API_KEY must contain a Resend API key');
      expect(error.message).not.toContain(apiKey);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it.each(['Vetify <onboarding@resend.dev>', 'no-reply@vetify.test'])(
    'accepts a valid sender (%s)',
    async (from) => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      vi.stubGlobal('fetch', fetchMock);
      await postMailMessage(message, { ...provider, from });
      expect(fetchMock).toHaveBeenCalledOnce();
    }
  );

  it('preserves custom provider key formats', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await postMailMessage(message, {
      ...provider,
      apiUrl: 'https://mail.test/emails',
      apiKey: 'custom-key',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
