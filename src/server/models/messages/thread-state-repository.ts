import type { ThreadState } from '@shared/schemas';
import { type ObjectId } from 'mongodb';

import { toObjectId } from '../object-id';
import { threadsCollection } from './repository';

// Clears one side's unread count and stamps when they read, so the other side can be shown a "Seen".
export async function clearThreadUnread(input: {
  thread: string | ObjectId;
  forClient: boolean;
  at?: Date;
}): Promise<void> {
  const now = input.at ?? new Date();
  const countField = input.forClient ? 'clientUnread' : 'professionalUnread';
  const readField = input.forClient ? 'clientReadAt' : 'professionalReadAt';
  await threadsCollection().updateOne(
    { _id: toObjectId(input.thread) },
    { $set: { [countField]: 0, [readField]: now, updatedAt: now } }
  );
}

// Files the caller's own copy of a thread on a shelf: active, archived, spam, or deleted. Never touches the other side.
export async function setThreadState(input: {
  thread: string | ObjectId;
  forClient: boolean;
  state: ThreadState;
}): Promise<void> {
  const field = input.forClient ? 'clientState' : 'professionalState';
  const unreadField = input.forClient ? 'clientUnread' : 'professionalUnread';
  const deletedAtField = input.forClient ? 'clientDeletedAt' : 'professionalDeletedAt';
  const now = new Date();
  await threadsCollection().updateOne(
    { _id: toObjectId(input.thread) },
    {
      $set: {
        [field]: input.state,
        ...(input.state === 'deleted' ? { [deletedAtField]: now, [unreadField]: 0 } : {}),
        updatedAt: now,
      },
    }
  );
}

export async function setThreadMuted(input: {
  thread: string | ObjectId;
  forClient: boolean;
  muted: boolean;
}): Promise<void> {
  const field = input.forClient ? 'clientMuted' : 'professionalMuted';
  await threadsCollection().updateOne(
    { _id: toObjectId(input.thread) },
    { $set: { [field]: input.muted, updatedAt: new Date() } }
  );
}

export async function setThreadUnread(input: {
  thread: string | ObjectId;
  forClient: boolean;
  unread: boolean;
}): Promise<void> {
  const field = input.forClient ? 'clientUnread' : 'professionalUnread';
  await threadsCollection().updateOne(
    { _id: toObjectId(input.thread) },
    { $set: { [field]: input.unread ? 1 : 0, updatedAt: new Date() } }
  );
}

export async function reportThread(input: {
  thread: string | ObjectId;
  forClient: boolean;
}): Promise<void> {
  const field = input.forClient ? 'clientReportedAt' : 'professionalReportedAt';
  await threadsCollection().updateOne(
    { _id: toObjectId(input.thread) },
    { $set: { [field]: new Date(), updatedAt: new Date() } }
  );
}

export type UnreadSide = 'all' | 'mine' | 'incoming';

// Counts unread messages on active inbox copies. A professional can ask for only
// incoming inquiries while the floating launcher asks for both account sides.
export async function countUnreadThreads(
  user: string | ObjectId,
  side: UnreadSide = 'all'
): Promise<number> {
  const id = toObjectId(user);
  const mine = { client: id, clientState: 'active' as const };
  const incoming = { professionalUser: id, professionalState: 'active' as const };
  const match = side === 'mine' ? mine : side === 'incoming' ? incoming : { $or: [mine, incoming] };
  const rows = await threadsCollection()
    .aggregate<{ total: number }>([
      { $match: match },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $eq: ['$client', id] },
                { $cond: [{ $eq: ['$clientMuted', true] }, 0, { $ifNull: ['$clientUnread', 0] }] },
                {
                  $cond: [
                    { $eq: ['$professionalMuted', true] },
                    0,
                    { $ifNull: ['$professionalUnread', 0] },
                  ],
                },
              ],
            },
          },
        },
      },
    ])
    .toArray();

  return rows[0]?.total ?? 0;
}
