import { describe, expect, it } from 'vitest';
import { env } from '../../../config/env';
import { accountLinkVerifications } from '../../../models/account-link-verification';
import { recentMail } from '../../../services/mail.service';
import { methods, session, setupAccountDb } from './account-auth-fixtures';
import { requestLinkCode } from './account-link-code-fixtures';

setupAccountDb();
describe('TikTok Web linking configuration', () => {
  it('disables TikTok linking on HTTP without sending a verification code', async () => {
    env.SERVER_URL = 'http://localhost:8000';
    const owner = await session();
    const response = await methods(owner);
    expect(response.body.availableProviders).toEqual(['google', 'facebook']);
    expect(response.body.tiktokHttpsReady).toBe(false);
    const requested = await requestLinkCode(owner, 'tiktok');
    expect(requested.status).toBe(501);
    expect(requested.body.reason).toBe('provider-unavailable');
    expect(recentMail()).toHaveLength(0);
    expect(await accountLinkVerifications().findOne({ _id: owner.user._id })).toBeNull();
  });

  it('makes TikTok available with configured credentials and HTTPS', async () => {
    const owner = await session();
    const response = await methods(owner);
    expect(response.body.availableProviders).toContain('tiktok');
    expect(response.body.tiktokHttpsReady).toBe(true);
    expect((await requestLinkCode(owner, 'tiktok')).status).toBe(200);
    expect(recentMail()).toHaveLength(1);
  });
});
