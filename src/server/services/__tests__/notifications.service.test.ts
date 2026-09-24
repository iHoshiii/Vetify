import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { insertUser, type User } from '../../models';
import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import {
  countUnread,
  createNotification,
  listForUser,
  markAllRead,
  markRead,
} from '../notifications.service';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

let seq = 0;

async function account(): Promise<User> {
  seq += 1;
  return await insertUser({
    email: `owner${seq}@example.com`,
    password: 'pw12345678',
    name: `Owner ${seq}`,
  });
}

async function seed(
  user: User,
  kind: 'booking_requested' | 'booking_confirmed' = 'booking_confirmed'
) {
  return await createNotification({
    user: user._id,
    kind,
    appointment: new ObjectId(),
    title: 'Appointment confirmed',
    body: "Rex's appointment.",
  });
}

describe('notifications.service', () => {
  it('records one unread and returns it as a view', async () => {
    const user = await account();
    const view = await seed(user);

    expect(view.read).toBe(false);
    expect(view.kind).toBe('booking_confirmed');
    expect(await countUnread(user._id)).toBe(1);
  });

  it('lists an account newest first, and only its own', async () => {
    const user = await account();
    const other = await account();
    const first = await seed(user, 'booking_requested');
    const second = await seed(user);
    await seed(other);

    const page = await listForUser({ user: user._id, page: 1, limit: 20 });

    expect(page.total).toBe(2);
    expect(page.items.map((n) => n.id)).toEqual([second.id, first.id]);
  });

  it('marks one read for its owner and drops the unread count', async () => {
    const user = await account();
    const view = await seed(user);

    const read = await markRead(view.id, user._id);

    expect(read?.read).toBe(true);
    expect(await countUnread(user._id)).toBe(0);
  });

  it('will not mark another account notification read', async () => {
    const user = await account();
    const other = await account();
    const view = await seed(user);

    expect(await markRead(view.id, other._id)).toBeNull();
    expect(await countUnread(user._id)).toBe(1);
  });

  it('clears the whole unread count in one call', async () => {
    const user = await account();
    await seed(user);
    await seed(user, 'booking_requested');

    expect(await markAllRead(user._id)).toBe(2);
    expect(await countUnread(user._id)).toBe(0);
  });
});
