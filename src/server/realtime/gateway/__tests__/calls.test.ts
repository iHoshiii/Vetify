import { randomUUID } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { insertUser } from '../../../models/users';
import { findAppointmentById } from '../../../models/appointments';
import { connections, memberships } from '../store';
import { handleGateway } from '../handler';
import { setupGateway, connect, event, received, callBooking, send } from './fixtures';

setupGateway();
describe('distributed call membership', () => {
  it('restricts joins and signalling to appointment participants', async () => {
    const { owner, vet, id } = await callBooking();
    const stranger = await insertUser({ email: 'stranger@test.invalid', provider: 'google' });
    const [a, b, outsider] = await Promise.all([connect(owner), connect(vet), connect(stranger)]);
    expect((await event(outsider, 'call:join', { appointmentId: id }))?.payload?.ok).toBe(false);
    expect((await event(a, 'call:join', { appointmentId: id }))?.payload?.peerOnline).toBe(false);
    expect((await event(b, 'call:join', { appointmentId: id }))?.payload?.peerOnline).toBe(true);
    expect((await findAppointmentById(id))?.consultedAt).toBeInstanceOf(Date);
    send.mockClear();
    await event(outsider, 'call:signal', { appointmentId: id, signal: { description: {} } });
    expect(received(a, 'call:signal')).toHaveLength(0);
    await event(a, 'call:signal', {
      appointmentId: id,
      signal: { description: { type: 'offer' } },
    });
    expect(received(b, 'call:signal')).toHaveLength(1);
    await event(a, 'call:chat', { appointmentId: id, text: 'Hello' });
    expect(received(b, 'call:chat')).toHaveLength(1);
    await event(a, 'call:leave', { appointmentId: id });
    expect(received(b, 'call:peer-left')).toHaveLength(1);
  });
  it('admits only one tab per participant even with simultaneous joins', async () => {
    const { owner, id } = await callBooking();
    const [first, second] = await Promise.all([connect(owner), connect(owner)]);
    const replies = await Promise.all([
      event(first, 'call:join', { appointmentId: id }),
      event(second, 'call:join', { appointmentId: id }),
    ]);
    expect(replies.filter((reply) => reply?.payload?.ok)).toHaveLength(1);
    expect(await memberships().countDocuments({ appointmentId: id })).toBe(1);
    expect((await findAppointmentById(id))?.consultedAt).toBeNull();
  });
  it('reconnects the same browser without waiting for a missing disconnect event', async () => {
    const { owner, vet, id } = await callBooking();
    const clientId = randomUUID();
    const first = await connect(owner, randomUUID(), clientId);
    const other = await connect(vet);
    await event(first, 'call:join', { appointmentId: id });
    await event(other, 'call:join', { appointmentId: id });
    const replacement = await connect(owner, randomUUID(), clientId);
    expect(await connections().findOne({ _id: first })).toBeNull();
    expect((await event(replacement, 'call:join', { appointmentId: id }))?.payload?.ok).toBe(true);
    await handleGateway({ requestContext: { routeKey: '$disconnect', connectionId: first } });
    expect(await memberships().countDocuments({ connectionId: replacement })).toBe(1);
  });
  it('denies expired call members and revoked recipients', async () => {
    const { owner, vet, id } = await callBooking();
    const [a, b] = await Promise.all([connect(owner), connect(vet)]);
    await event(a, 'call:join', { appointmentId: id });
    await event(b, 'call:join', { appointmentId: id });
    await memberships().updateMany({ appointmentId: id }, { $set: { endsAt: new Date(0) } });
    send.mockClear();
    expect((await event(a, 'call:signal', { appointmentId: id, signal: {} }))?.payload?.ok).toBe(
      false
    );
    expect(received(b, 'call:signal')).toHaveLength(0);
  });
});
