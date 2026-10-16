import { adminReply } from './api-admin';
import { pollingBridge } from './realtime';
import { clinics } from './data-clinics';
import type { BrowserContext } from '@playwright/test';
import { defaultUserPreferences } from '../../src/shared/schemas';
import {
  account,
  DATE,
  message,
  pageOf,
  post,
  professional,
  thread,
  USER_ID,
  vet,
  VET_ID,
} from './data';

export type Role = 'guest' | 'user' | 'professional' | 'admin';
export async function installApi(context: BrowserContext, role: Role, realtime = false) {
  const polling = pollingBridge();
  const messages = [message];
  const accessToken = `test.${Buffer.from(
    JSON.stringify({ sub: USER_ID, exp: Math.floor(Date.now() / 1000) + 3600 })
  ).toString('base64url')}.test`;
  const session = {
    accessToken,
    user: {
      ...account,
      id: USER_ID,
      role: role === 'guest' ? 'user' : role,
      name: 'Responsive Test',
      email: 'owner@example.test',
    },
  };
  await context.addInitScript(
    ({ role, session }) => {
      if (role !== 'guest') localStorage.setItem('vetify.auth', JSON.stringify(session));
      sessionStorage.setItem('vetify.professionals.termsAgreed', 'yes');
    },
    { role, session }
  );
  const unknown = new Set<string>();
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
    if (url.pathname.startsWith('/socket.io')) return realtime ? polling(route) : route.abort();
    const path = url.pathname.replace('/api/v1', '');
    if (!url.pathname.startsWith('/api/v1/')) return route.continue();
    const reply = (json: unknown, status = 200) => route.fulfill({ status, json });
    if (path === '/auth/refresh')
      return reply(
        role === 'guest' ? { error: 'Not signed in' } : session,
        role === 'guest' ? 401 : 200
      );
    if (path === '/health') return reply({ status: 'ok', db: 'connected', uptime: 1000 });
    if (path === '/account/preferences') return reply({ preferences: defaultUserPreferences() });
    if (path === '/account/login-methods')
      return reply({
        hasPassword: false,
        providers: ['google'],
        googleAvailable: true,
        availableProviders: ['google', 'facebook', 'tiktok'],
        passwordReady: false,
        reauthProvider: 'google',
      });
    if (path.endsWith('/link/code'))
      return reply({
        sent: true,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
      });
    if (path.endsWith('/link/verify')) return reply({ verified: true });
    if (path === '/account/blocked') return reply({ blocked: [] });
    if (path === '/auth/subscription')
      return reply({ plan: 'free', status: 'active', expiresAt: null });
    if (path.endsWith('/unread')) return reply({ unread: 0 });
    if (path === '/notifications') return reply(pageOf());
    if (path.startsWith('/messages/') && path.endsWith('/messages')) {
      if (route.request().method() === 'POST') {
        const sent = {
          ...message,
          id: 'sent-message',
          body: route.request().postDataJSON().body,
          fromYou: true,
        };
        messages.push(sent);
        return reply({ message: sent });
      }
      return reply({ ...pageOf(message), items: messages, otherReadAt: null });
    }
    if (path === '/messages/mine' || path === '/messages/incoming') return reply(pageOf(thread));
    if (path.startsWith('/messages/')) return reply({ updated: true });
    if (path === '/chat')
      return reply({
        reply: 'Please contact a veterinarian if symptoms persist.',
        anonRemaining: 4,
      });
    if (path === '/clinics') return reply(clinics);
    if (path === '/professionals/me')
      return role === 'professional' ? reply(professional) : reply({ error: 'Not filed' }, 404);
    if (path === '/professionals') return reply(pageOf(vet));
    if (path === '/professionals/near')
      return reply({ items: [{ ...vet, distanceMeters: 750 }], radiusKm: 25 });
    if (path.startsWith('/professionals/invites/'))
      return reply({ error: 'This invitation has expired.' }, 400);
    if (path.endsWith('/rating-breakdown'))
      return reply({ breakdown: [0, 0, 0, 2, 10], average: 4.8, count: 12 });
    if (/\/professionals\/[^/]+\/reviews$/.test(path))
      return reply(
        pageOf({
          id: 'r1',
          stars: 5,
          comment: 'Thoughtful care.',
          reviewer: 'A***',
          ratedAt: DATE,
          reply: null,
          repliedAt: null,
        })
      );
    if (path.endsWith('/slots'))
      return reply({
        minutes: 60,
        days: [
          {
            date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()),
            slots: [{ at: new Date(Date.now() + 3600000).toISOString(), taken: false }],
          },
        ],
      });
    if (path === `/professionals/${VET_ID}`) return reply(vet);
    if (path.includes('/appointments/'))
      return reply(
        path.endsWith('/counts')
          ? {
              counts: {
                virtual: { requested: 1, confirmed: 0, declined: 0, cancelled: 0, completed: 0 },
                onsite: { requested: 0, confirmed: 0, declined: 0, cancelled: 0, completed: 0 },
              },
            }
          : pageOf()
      );
    if (path === '/blogs') return reply(pageOf(post));
    if (path.startsWith('/blogs/')) return reply(post);
    const admin = adminReply(url);
    if (admin !== undefined) return reply(admin);
    unknown.add(`${route.request().method()} ${path}`);
    return reply(pageOf());
  });
  return unknown;
}
