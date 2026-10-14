import { connections, memberships } from './store';
import { sendConnection } from './delivery';
import { gatewayTransport } from './transport';
import { authenticateConnection } from './events';
import { announceCall, removeConnection } from './calls';
import { announcePresence } from './presence';
import { AppError } from '../../utils/AppError';

export async function maintainRealtime(): Promise<void> {
  const expiredCalls = await memberships()
    .find({ endsAt: { $lte: new Date() } })
    .limit(100)
    .toArray();
  for (const member of expiredCalls) {
    await sendConnection(member.connectionId, 'call:ended', {
      reason: 'ended',
      appointmentId: member.appointmentId,
    });
    await memberships().deleteOne({ _id: member._id, connectionId: member.connectionId });
    await announceCall(member.appointmentId);
  }
  const active = await connections().find().sort({ leaseUntil: 1 }).limit(1000).toArray();
  for (const connection of active) {
    let reason: string | undefined;
    try {
      await authenticateConnection(connection);
    } catch (error) {
      if (!(error instanceof AppError) && !(error instanceof Error && error.message === 'expired'))
        throw error;
      reason = error instanceof Error && error.message === 'expired' ? 'expired' : 'restricted';
    }
    if (!reason && connection.leaseUntil.getTime() > Date.now()) {
      if (connection.ready && connection.expiresAt - Date.now() < 60_000)
        await sendConnection(connection._id, 'session:renew-needed');
      continue;
    }
    if (reason) await sendConnection(connection._id, 'session:ended', { reason });
    await gatewayTransport().close(connection._id);
    await removeConnection(connection);
    await announcePresence(connection.userId);
  }
}
