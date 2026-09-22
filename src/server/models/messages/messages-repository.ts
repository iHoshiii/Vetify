import { MESSAGE_PAGE_SIZE } from '@shared/limits';
import { ObjectId, type Collection } from 'mongodb';

import { getDb } from '../../config/db';
import { toObjectId } from '../object-id';
import { messageAttrsSchema, type MessageAttrs } from './schema';
import { MESSAGES_COLLECTION, type MessageDocument } from './types';

export function messagesCollection(): Collection<MessageDocument> {
  return getDb().collection<MessageDocument>(MESSAGES_COLLECTION);
}

// Stores one message. The thread's own last-message copy is stamped separately by the service.
export async function insertMessage(attrs: MessageAttrs): Promise<MessageDocument> {
  const parsed = messageAttrsSchema.parse(attrs);

  const doc: MessageDocument = {
    _id: new ObjectId(),
    thread: toObjectId(parsed.thread),
    sender: toObjectId(parsed.sender),
    body: parsed.body,
    createdAt: new Date(),
  };

  await messagesCollection().insertOne(doc);
  return doc;
}

// One page of a thread, newest first so the last page is the latest talk.
export async function findMessages(input: {
  thread: string | ObjectId;
  after?: Date | null;
  page?: number;
  limit?: number;
}): Promise<{ items: MessageDocument[]; total: number }> {
  const { thread, after, page = 1, limit = MESSAGE_PAGE_SIZE } = input;
  const filter = {
    thread: toObjectId(thread),
    ...(after ? { createdAt: { $gt: after } } : {}),
  };

  const [items, total] = await Promise.all([
    messagesCollection()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    messagesCollection().countDocuments(filter),
  ]);

  return { items, total };
}
