import { createHash, randomBytes } from 'node:crypto';
import { getDb } from '../../config/db';
import type { SocketSession } from '../session';

type Ticket = SocketSession & { _id: string; clientId: string; expiresOn: Date };
const tickets = () => getDb().collection<Ticket>('realtimetickets');
const digest = (ticket: string) => createHash('sha256').update(ticket).digest('hex');

export async function ensureTicketIndexes(): Promise<void> {
  await tickets().createIndex({ expiresOn: 1 }, { expireAfterSeconds: 0 });
}

export async function issueTicket(session: SocketSession, clientId: string): Promise<string> {
  const ticket = randomBytes(32).toString('hex');
  await tickets().insertOne({
    ...session,
    clientId,
    _id: digest(ticket),
    expiresOn: new Date(Date.now() + 30_000),
  });
  return ticket;
}

export async function consumeTicket(
  ticket: string
): Promise<(SocketSession & { clientId: string }) | null> {
  if (!/^[a-f0-9]{64}$/.test(ticket)) return null;
  const found = await tickets().findOneAndDelete({
    _id: digest(ticket),
    expiresOn: { $gt: new Date() },
  });
  if (!found || found.expiresAt <= Date.now()) return null;
  return {
    userId: found.userId,
    sessionVersion: found.sessionVersion,
    expiresAt: found.expiresAt,
    clientId: found.clientId,
  };
}
