import { describe, expect, it } from 'vitest';

import { env } from '../../config/env';
import { applyLink, declineEmail, interviewEmail, inviteEmail } from '../professional-mail';

const EXPIRES = new Date('2026-09-10T02:00:00.000Z');

describe('inviteEmail', () => {
  it('carries the link in both bodies and says what to bring', () => {
    const message = inviteEmail({
      to: 'vet@example.com',
      name: 'Marites Reyes DVM',
      token: 'abc123',
      expiresAt: EXPIRES,
    });

    expect(message.to).toBe('vet@example.com');
    expect(message.text).toContain('Hi Marites,');
    expect(message.text).toContain(applyLink('abc123'));
    expect(message.text).toContain('PRC licence card');
    expect(message.html).toContain(`<a href="${applyLink('abc123')}"`);
  });

  it('dates the expiry in Philippine time, where the applicants are', () => {
    const message = inviteEmail({
      to: 'vet@example.com',
      name: 'Marites',
      token: 'abc123',
      // 02:00 UTC is already the 10th in Manila; a UTC rendering would say the 9th
      // to anyone reading it after 8pm local.
      expiresAt: new Date('2026-09-09T20:30:00.000Z'),
    });

    expect(message.text).toContain('September 10, 2026');
  });

  it('escapes a reviewer note rather than letting it write markup', () => {
    const message = inviteEmail({
      to: 'vet@example.com',
      name: 'Marites',
      token: 'abc123',
      expiresAt: EXPIRES,
      note: 'Bring the <b>original</b> card & the receipt',
    });

    expect(message.text).toContain('Bring the <b>original</b> card & the receipt');
    expect(message.html).toContain('Bring the &lt;b&gt;original&lt;/b&gt; card &amp; the receipt');
    expect(message.html).not.toContain('<b>');
  });

  it('points at this deployment, not at the API', () => {
    expect(applyLink('abc123')).toBe(`${env.CLIENT_ORIGIN}/professionals/apply/abc123`);
  });
});

describe('the other two notices', () => {
  it('declines without repeating the reviewer note', () => {
    const message = declineEmail({ to: 'vet@example.com', name: 'Marites Reyes' });

    expect(message.subject).toBe('About your Vetify enquiry');
    expect(message.text).toContain('not taking it further at this time');
    expect(message.text).toContain(`${env.CLIENT_ORIGIN}/contact`);
  });

  it('gives the interview time with its timezone spelled out', () => {
    const message = interviewEmail({
      to: 'vet@example.com',
      name: 'Marites',
      at: new Date('2026-09-10T06:30:00.000Z'),
      note: 'Video call, twenty minutes.',
    });

    expect(message.text).toContain('September 10, 2026');
    expect(message.text).toContain('2:30');
    expect(message.text).toContain('(Philippine time)');
    expect(message.text).toContain('Video call, twenty minutes.');
  });
});
