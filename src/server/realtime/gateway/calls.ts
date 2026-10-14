import { MESSAGE_MAX_LENGTH } from '@shared/limits';
import {
  findAppointmentById,
  markCallJoined,
  markClientJoined,
  markCallConnected,
} from '../../models';
import { callPeer, effectiveCallEnd, loadJoinableCall } from '../call-window';
import { iceServers } from '../ice';
import {
  claimMembership,
  connections,
  liveFilter,
  memberships,
  memberFilter,
  type Connection,
} from './store';
import { deliver, sendUser, validConnection } from './delivery';
import { announcePresence } from './presence';

export async function announceCall(appointmentId: string): Promise<void> {
  const appointment = await findAppointmentById(appointmentId);
  if (!appointment) return;
  await Promise.all(
    [appointment.client, appointment.professionalUser].map((id) =>
      sendUser(id.toString(), 'appointment:changed', { id: appointmentId })
    )
  );
}
export async function relayCall(
  connection: Connection,
  appointmentId: string,
  event: string,
  payload?: unknown
): Promise<void> {
  const members = await memberships()
    .find({ appointmentId, connectionId: { $ne: connection._id }, ...memberFilter() })
    .toArray();
  await Promise.all(
    members.map(async (member) => {
      const target = await connections().findOne({ _id: member.connectionId, ...liveFilter() });
      if (target)
        await deliver(target, event, {
          ...(payload && typeof payload === 'object' ? payload : {}),
          appointmentId,
        });
    })
  );
}
export async function joinCall(connection: Connection, payload: unknown): Promise<unknown> {
  const id = (payload as { appointmentId?: unknown })?.appointmentId;
  const appointment = typeof id === 'string' ? await loadJoinableCall(connection.userId, id) : null;
  if (!appointment || typeof id !== 'string') return { ok: false, error: 'not allowed' };
  const endsAt = await effectiveCallEnd(appointment);
  if (!(await claimMembership(connection, id, endsAt))) return { ok: false, error: 'call is full' };
  const members = await memberships()
    .find({ appointmentId: id, ...memberFilter() })
    .toArray();
  const peerMembers = members.filter((member) => member.userId !== connection.userId);
  const peerConnections = await connections()
    .find({ _id: { $in: peerMembers.map((member) => member.connectionId) }, ...liveFilter() })
    .toArray();
  const peerOnline = (await Promise.all(peerConnections.map(validConnection))).some(Boolean);
  const polite = connection.userId === appointment.client.toString();
  await markCallJoined(appointment._id);
  if (polite) await markClientJoined(appointment._id);
  if (peerOnline) await markCallConnected(id);
  await relayCall(connection, id, 'call:peer-joined');
  await announceCall(id);
  return {
    ok: true,
    iceServers: iceServers(),
    peerOnline,
    polite,
    endsAt: endsAt.toISOString(),
    peer: await callPeer(appointment, connection.userId),
  };
}
export async function leaveCall(connection: Connection, id: string): Promise<void> {
  const deleted = await memberships().findOneAndDelete({
    appointmentId: id,
    connectionId: connection._id,
  });
  if (!deleted) return;
  await relayCall(connection, id, 'call:peer-left');
  await announceCall(id);
}
export async function callEvent(
  connection: Connection,
  event: string,
  payload: unknown
): Promise<unknown> {
  if (event === 'call:join') return joinCall(connection, payload);
  const data = payload as { appointmentId?: unknown; signal?: unknown; text?: unknown };
  if (typeof data?.appointmentId !== 'string') return { ok: false };
  const id = data.appointmentId;
  if (event === 'call:leave') {
    await leaveCall(connection, id);
    return { ok: true };
  }
  const member = await memberships().findOne({
    appointmentId: id,
    connectionId: connection._id,
    ...memberFilter(),
  });
  if (!member || !(await loadJoinableCall(connection.userId, id))) return { ok: false };
  if (event === 'call:signal' && data.signal && typeof data.signal === 'object') {
    await relayCall(connection, id, event, { signal: data.signal });
  } else if (event === 'call:chat' && typeof data.text === 'string') {
    const text = data.text.trim().slice(0, MESSAGE_MAX_LENGTH);
    if (text) await relayCall(connection, id, event, { text });
  } else return { ok: false };
  return { ok: true };
}
export async function removeConnection(connection: Connection): Promise<void> {
  const calls = await memberships().find({ connectionId: connection._id }).toArray();
  const deleted = await connections().deleteOne({ _id: connection._id });
  for (const call of calls) await leaveCall(connection, call.appointmentId);
  if (deleted.deletedCount) await announcePresence(connection.userId);
}
export async function callLive(id: string): Promise<boolean> {
  const members = await memberships()
    .find({ appointmentId: id, ...memberFilter() })
    .toArray();
  const targets = await connections()
    .find({ _id: { $in: members.map((member) => member.connectionId) }, ...liveFilter() })
    .toArray();
  return (await Promise.all(targets.map(validConnection))).some(Boolean);
}
