import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../app';
import { insertUser, updateUser, usersCollection } from '../../../models/users';
import { signAccessToken } from '../../../services/auth.service';
import { generateReply } from '../../../services/chat.service';
import { changeUserStatus } from '../../../services/user-moderation.service';
import { clearTestDb, startTestDb, stopTestDb } from '../../../test-utils/db';

vi.mock('../../../services/chat.service', () => ({
  generateReply: vi.fn().mockResolvedValue('reply'),
}));
const app = createApp();
beforeAll(startTestDb);
afterEach(async () => {
  vi.clearAllMocks();
  await clearTestDb();
});
afterAll(stopTestDb);

describe('chat account access', () => {
  it.each(['suspended', 'banned', 'deactivated'] as const)(
    'refuses a %s account before contacting AI',
    async (status) => {
      const user = await insertUser({ email: 'restricted@test.invalid', provider: 'google' });
      const token = signAccessToken({ sub: user._id.toString(), email: user.email, role: 'user' });
      await updateUser(user._id, { status });
      const res = await request(app)
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'dog question' });
      expect(res.status).toBe(403);
      expect(res.body.reason).toBe(`account-${status}`);
      expect(generateReply).not.toHaveBeenCalled();
    }
  );

  it('refuses a session revoked by a password reset', async () => {
    const user = await insertUser({ email: 'reset@test.invalid', provider: 'google' });
    const token = signAccessToken({ sub: user._id.toString(), email: user.email, role: 'user' });
    await usersCollection().updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'dog question' });
    expect(res.status).toBe(401);
    expect(res.body.reason).toBe('session-revoked');
    expect(generateReply).not.toHaveBeenCalled();
  });

  it('keeps old sign-ins invalid after a suspension is lifted', async () => {
    const user = await insertUser({ email: 'lifted@test.invalid', provider: 'google' });
    const admin = await insertUser({
      email: 'admin@test.invalid',
      provider: 'google',
      role: 'admin',
    });
    const token = signAccessToken({ sub: user._id.toString(), email: user.email, role: 'user' });
    await changeUserStatus({ id: user._id, moderator: admin, to: 'suspended', reason: 'Test' });
    await changeUserStatus({ id: user._id, moderator: admin, to: 'active' });
    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'dog question' });
    expect(res.status).toBe(401);
    expect(generateReply).not.toHaveBeenCalled();
  });
});
