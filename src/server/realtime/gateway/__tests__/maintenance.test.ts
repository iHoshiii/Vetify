import { describe, it, expect } from 'vitest';
import { insertUser, usersCollection } from '../../../models/users';
import { connections, memberships } from '../store';
import { maintainRealtime } from '../maintenance';
import { sendUser, closeUser } from '../delivery';
import { withRealtimeWork, queueDelivery } from '../work';
import { setupGateway, connect, event, callBooking, received, send, close } from './fixtures';

setupGateway();
describe('gateway cleanup and delivery', () => {
  it('removes abandoned connections and call membership without disconnect events', async () => {
    const { owner, vet, id } = await callBooking();
    const [a, b] = await Promise.all([connect(owner), connect(vet)]);
    await event(a, 'call:join', { appointmentId: id });
    await event(b, 'call:join', { appointmentId: id });
    await connections().updateOne({ _id: a }, { $set: { leaseUntil: new Date(0) } });
    await maintainRealtime();
    expect(await connections().findOne({ _id: a })).toBeNull();
    expect(await memberships().findOne({ connectionId: a })).toBeNull();
    expect(received(b, 'call:peer-left')).toHaveLength(1);
  });
  it('ends expired calls using persisted deadlines', async () => {
    const { owner, id } = await callBooking();
    const a = await connect(owner);
    await event(a, 'call:join', { appointmentId: id });
    await memberships().updateMany({}, { $set: { endsAt: new Date(0) } });
    await maintainRealtime();
    expect(received(a, 'call:ended')).toHaveLength(1);
    expect(await memberships().countDocuments()).toBe(0);
  });
  it('avoids delivering private events to newly restricted accounts', async () => {
    const user = await insertUser({ email: 'delivery@test.invalid', provider: 'google' });
    const id = await connect(user);
    await usersCollection().updateOne({ _id: user._id }, { $set: { status: 'banned' } });
    await sendUser(user._id.toString(), 'thread:message', { threadId: 'private' });
    expect(received(id, 'thread:message')).toHaveLength(0);
    expect(close).toHaveBeenCalledWith(id);
  });
  it('closes old sessions while preserving newly reinstated connections', async () => {
    const user = await insertUser({ email: 'versions@test.invalid', provider: 'google' });
    const old = await connect(user);
    await usersCollection().updateOne({ _id: user._id }, { $set: { sessionVersion: 2 } });
    const fresh = await connect({ ...user, sessionVersion: 2 });
    await closeUser(user._id.toString(), 2);
    expect(close).toHaveBeenCalledWith(old);
    expect(close).not.toHaveBeenCalledWith(fresh);
  });
  it('awaits queued notification work before completing a Lambda invocation', async () => {
    let finish!: () => void;
    let returned = false;
    const work = withRealtimeWork(async () => {
      queueDelivery(
        new Promise<void>((resolve) => {
          finish = resolve;
        })
      );
      return 42;
    });
    void work.then(() => {
      returned = true;
    });
    await Promise.resolve();
    expect(returned).toBe(false);
    finish();
    expect(await work).toBe(42);
  });
  it('removes gone gateway connections during delivery', async () => {
    const user = await insertUser({ email: 'gone@test.invalid', provider: 'google' });
    const id = await connect(user);
    send.mockResolvedValue(false);
    await sendUser(user._id.toString(), 'notification:new', {});
    expect(await connections().findOne({ _id: id })).toBeNull();
  });
});
