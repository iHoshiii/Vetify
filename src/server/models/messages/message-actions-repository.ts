import { ObjectId, type Filter } from 'mongodb';

import { toObjectId } from '../object-id';
import { messagesCollection } from './messages-repository';
import { threadsCollection } from './repository';
import type { MessageDocument, ThreadDocument } from './types';

export async function findMessageById(id: string | ObjectId): Promise<MessageDocument | null> {
  return await messagesCollection().findOne({ _id: toObjectId(id) });
}

export async function editStoredMessage(input: {
  message: MessageDocument;
  body: string;
  at: Date;
}): Promise<MessageDocument | null> {
  return await messagesCollection().findOneAndUpdate(
    {
      _id: input.message._id,
      thread: input.message.thread,
      sender: input.message.sender,
      unsentAt: null,
    },
    { $set: { body: input.body, editedAt: input.at } },
    { returnDocument: 'after' }
  );
}

export async function unsendStoredMessage(input: {
  message: MessageDocument;
  at: Date;
}): Promise<MessageDocument | null> {
  return await messagesCollection().findOneAndUpdate(
    {
      _id: input.message._id,
      thread: input.message.thread,
      sender: input.message.sender,
      unsentAt: null,
    },
    { $set: { body: '', unsentAt: input.at } },
    { returnDocument: 'after' }
  );
}

export async function updateLatestMessagePreview(input: {
  thread: ThreadDocument;
  message: MessageDocument;
  body: string;
  at: Date;
}): Promise<void> {
  const legacyLatest: Filter<ThreadDocument> = {
    lastMessage: { $exists: false },
    lastSender: input.message.sender,
    lastAt: input.message.createdAt,
  };
  await threadsCollection().updateOne(
    {
      _id: input.thread._id,
      $or: [{ lastMessage: input.message._id }, legacyLatest],
    },
    { $set: { lastBody: input.body, updatedAt: input.at } }
  );
}

export async function decrementUnreadAfterUnsend(input: {
  thread: ThreadDocument;
  message: MessageDocument;
  senderIsClient: boolean;
  at: Date;
}): Promise<void> {
  const unread = input.senderIsClient ? 'professionalUnread' : 'clientUnread';
  const readAt = input.senderIsClient ? 'professionalReadAt' : 'clientReadAt';
  const deletedAt = input.senderIsClient ? 'professionalDeletedAt' : 'clientDeletedAt';

  await threadsCollection().updateOne(
    {
      _id: input.thread._id,
      $expr: {
        $and: [
          { $lt: [{ $ifNull: [`$${readAt}`, new Date(0)] }, input.message.createdAt] },
          { $lt: [{ $ifNull: [`$${deletedAt}`, new Date(0)] }, input.message.createdAt] },
        ],
      },
    },
    [
      {
        $set: {
          [unread]: { $max: [0, { $subtract: [`$${unread}`, 1] }] },
          updatedAt: input.at,
        },
      },
    ]
  );
}
