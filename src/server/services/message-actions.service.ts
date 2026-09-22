import { MESSAGE_ACTION_WINDOW_MS } from '@shared/limits';

import {
  decrementUnreadAfterUnsend,
  editStoredMessage,
  findMessageById,
  hideStoredMessage,
  type MessageDocument,
  type ThreadDocument,
  type User,
  unsendStoredMessage,
  updateLatestMessagePreview,
} from '../models';
import { emitToUser } from '../realtime/hub';
import { AppError } from '../utils/AppError';

const MISSING = 'Message not found';

function visibleMessage(
  message: MessageDocument | null,
  thread: ThreadDocument,
  user: User
): MessageDocument {
  if (!message || !message.thread.equals(thread._id)) {
    throw AppError.notFound(MISSING);
  }
  const deletedAt = thread.client.equals(user._id)
    ? thread.clientDeletedAt
    : thread.professionalDeletedAt;
  if (deletedAt && message.createdAt <= deletedAt) throw AppError.notFound(MISSING);
  if (message.hiddenFor?.some((viewer) => viewer.equals(user._id)))
    throw AppError.notFound(MISSING);
  return message;
}

function ownedEditableMessage(message: MessageDocument, user: User): MessageDocument {
  if (!message.sender.equals(user._id)) throw AppError.notFound(MISSING);
  if (Date.now() - message.createdAt.getTime() > MESSAGE_ACTION_WINDOW_MS) {
    throw AppError.conflict('Messages can only be edited within 15 minutes');
  }
  if (message.unsentAt) throw AppError.conflict('This message was already unsent');
  return message;
}

function notifyParties(thread: ThreadDocument): void {
  const event = { threadId: thread._id.toString() };
  emitToUser(thread.client.toString(), 'thread:message', event);
  emitToUser(thread.professionalUser.toString(), 'thread:message', event);
}

export async function editOwnMessage(input: {
  thread: ThreadDocument;
  user: User;
  messageId: string;
  body: string;
}): Promise<MessageDocument> {
  const message = ownedEditableMessage(
    visibleMessage(await findMessageById(input.messageId), input.thread, input.user),
    input.user
  );
  const now = new Date();
  const updated = await editStoredMessage({ message, body: input.body, at: now });
  if (!updated) throw AppError.conflict('This message can no longer be edited');
  await updateLatestMessagePreview({ thread: input.thread, message, body: input.body, at: now });
  notifyParties(input.thread);
  return updated;
}

export async function deleteMessage(input: {
  thread: ThreadDocument;
  user: User;
  messageId: string;
}): Promise<{ message: MessageDocument | null; removedForYou: boolean }> {
  const message = visibleMessage(await findMessageById(input.messageId), input.thread, input.user);
  if (!message.sender.equals(input.user._id) || message.unsentAt) {
    if (!(await hideStoredMessage({ message, viewer: input.user._id })))
      throw AppError.notFound(MISSING);
    emitToUser(input.user._id.toString(), 'thread:message', {
      threadId: input.thread._id.toString(),
    });
    return { message: null, removedForYou: true };
  }
  const now = new Date();
  const updated = await unsendStoredMessage({ message, at: now });
  if (!updated) throw AppError.conflict('This message can no longer be unsent');
  const senderIsClient = input.thread.client.equals(input.user._id);
  await Promise.all([
    updateLatestMessagePreview({
      thread: input.thread,
      message,
      body: 'Message was unsent',
      at: now,
    }),
    decrementUnreadAfterUnsend({ thread: input.thread, message, senderIsClient, at: now }),
  ]);
  notifyParties(input.thread);
  return { message: updated, removedForYou: false };
}
