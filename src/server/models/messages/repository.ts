import { THREAD_PAGE_SIZE } from '@shared/limits';
import type { ThreadState } from '@shared/schemas';
import { ObjectId, type Collection, type Filter } from 'mongodb';

import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { threadAttrsSchema, type ThreadAttrs } from './schema';
import { THREADS_COLLECTION, type ThreadDocument } from './types';

const DUPLICATE_KEY = 11000;

export function threadsCollection(): Collection<ThreadDocument> {
  return getDb().collection<ThreadDocument>(THREADS_COLLECTION);
}

export function isDuplicateThread(err: unknown): boolean {
  return (err as { code?: number } | null)?.code === DUPLICATE_KEY;
}

// Opens a thread. Starts empty, with both sides read up to date.
export async function insertThread(attrs: ThreadAttrs): Promise<ThreadDocument> {
  const parsed = threadAttrsSchema.parse(attrs);
  const now = new Date();

  const doc: ThreadDocument = {
    _id: new ObjectId(),
    professional: toObjectId(parsed.professional),
    professionalUser: toObjectId(parsed.professionalUser),
    client: toObjectId(parsed.client),
    lastBody: null,
    lastSender: null,
    lastAt: null,
    clientUnread: 0,
    professionalUnread: 0,
    clientMuted: false,
    professionalMuted: false,
    clientReportedAt: null,
    professionalReportedAt: null,
    clientDeletedAt: null,
    professionalDeletedAt: null,
    clientState: 'active',
    professionalState: 'active',
    clientReadAt: null,
    professionalReadAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await threadsCollection().insertOne(doc);
  return doc;
}

export async function findThreadById(id: string | ObjectId): Promise<ThreadDocument | null> {
  return await threadsCollection().findOne({ _id: toObjectId(id) });
}

// The one thread for a pair, so a repeat open reuses it rather than racing the unique index.
export async function findThreadByPair(input: {
  client: string | ObjectId;
  professionalUser: string | ObjectId;
}): Promise<ThreadDocument | null> {
  return await threadsCollection().findOne({
    client: toObjectId(input.client),
    professionalUser: toObjectId(input.professionalUser),
  });
}

export type FindThreadsOptions = {
  client?: string | ObjectId;
  professionalUser?: string | ObjectId;
  // Which shelf to read, matched against the caller's own state field. Omitted means every shelf.
  state?: ThreadState;
  page?: number;
  limit?: number;
};

// One page of somebody's threads, most recently active first, empty ones sinking to the bottom.
export async function findThreads(
  options: FindThreadsOptions
): Promise<{ items: ThreadDocument[]; total: number }> {
  const { client, professionalUser, state, page = 1, limit = THREAD_PAGE_SIZE } = options;

  const filter: Filter<ThreadDocument> = {};
  if (client) filter.client = toObjectId(client);
  if (professionalUser) filter.professionalUser = toObjectId(professionalUser);
  // The state lives on the caller's own side of the row, so the filter follows the side being listed.
  if (state) filter[client ? 'clientState' : 'professionalState'] = state;

  const [items, total] = await Promise.all([
    threadsCollection()
      .find(filter)
      .sort({ lastAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    threadsCollection().countDocuments(filter),
  ]);

  return { items, total };
}

// Stamps the newest message onto the thread and bumps the other side's unread count.
export async function touchThreadOnSend(input: {
  thread: string | ObjectId;
  sender: string | ObjectId;
  body: string;
  senderIsClient: boolean;
  at: Date;
}): Promise<ThreadDocument | null> {
  // A message resurfaces the thread for both sides: the sender re-engaging their own copy and the recipient's archived or deleted one, the way Messenger's does.
  const recipientState = input.senderIsClient ? { professionalUnread: 1 } : { clientUnread: 1 };
  const wake: Partial<Pick<ThreadDocument, 'clientState' | 'professionalState'>> = {
    clientState: 'active',
    professionalState: 'active',
  };

  return await threadsCollection().findOneAndUpdate(
    { _id: toObjectId(input.thread) },
    {
      $set: {
        lastBody: input.body,
        lastSender: toObjectId(input.sender),
        lastAt: input.at,
        updatedAt: input.at,
        ...wake,
      },
      $inc: recipientState,
    },
    { returnDocument: 'after' }
  );
}
