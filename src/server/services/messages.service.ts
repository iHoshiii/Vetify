import {
  clearThreadUnread,
  findProfessionalById,
  findThreadByPair,
  insertMessage,
  insertThread,
  isDuplicateThread,
  touchThreadOnSend,
  type MessageDocument,
  type ThreadDocument,
  type User,
} from '../models';
import { AppError } from '../utils/AppError';
import { emitToUser } from '../realtime/hub';

// The two accounts on a thread, so a caller can be checked against it and the other side notified.
function partiesOf(thread: ThreadDocument): { client: string; professionalUser: string } {
  return { client: thread.client.toString(), professionalUser: thread.professionalUser.toString() };
}

function isParty(thread: ThreadDocument, user: User): boolean {
  return thread.client.equals(user._id) || thread.professionalUser.equals(user._id);
}

/**
 * Opens the thread between an owner and a vet, or returns the one already open.
 *
 * Returns null for a vet who does not exist or is not verified — the same single
 * answer bookings give, so a guessed id cannot confirm a hidden application.
 */
export async function openThread(input: {
  user: User;
  professionalId: string;
}): Promise<ThreadDocument | null> {
  const application = await findProfessionalById(input.professionalId);
  if (!application || application.status !== 'verified') return null;

  if (application.user.equals(input.user._id)) {
    throw AppError.badRequest('You cannot message yourself');
  }

  const existing = await findThreadByPair({
    client: input.user._id,
    professionalUser: application.user,
  });
  if (existing) return existing;

  try {
    return await insertThread({
      professional: application._id,
      professionalUser: application.user,
      client: input.user._id,
    });
  } catch (err) {
    // Two opens at once: the unique index refused the second, so read back the winner.
    if (isDuplicateThread(err)) {
      return await findThreadByPair({ client: input.user._id, professionalUser: application.user });
    }
    throw err;
  }
}

// A thread only its two parties may touch. Anyone else gets a 404, not a 403 that confirms it exists.
export function ensureParty(thread: ThreadDocument | null, user: User): ThreadDocument {
  if (!thread || !isParty(thread, user)) throw AppError.notFound('Conversation not found');
  return thread;
}

/** Stores a message, stamps the thread, and pushes it to the other side in real time. */
export async function sendMessage(input: {
  thread: ThreadDocument;
  sender: User;
  body: string;
}): Promise<MessageDocument> {
  const { thread, sender, body } = input;
  const senderIsClient = thread.client.equals(sender._id);

  const message = await insertMessage({ thread: thread._id, sender: sender._id, body });
  await touchThreadOnSend({
    thread: thread._id,
    sender: sender._id,
    body,
    senderIsClient,
    at: message.createdAt,
  });

  // Signal the recipient to refetch: both sides invalidate the thread and their list.
  const { client, professionalUser } = partiesOf(thread);
  const recipient = senderIsClient ? professionalUser : client;
  emitToUser(recipient, 'thread:message', { threadId: thread._id.toString() });
  emitToUser(sender._id.toString(), 'thread:message', { threadId: thread._id.toString() });

  return message;
}

/** Marks the caller's side of a thread read. */
export async function readThread(thread: ThreadDocument, reader: User): Promise<void> {
  await clearThreadUnread({ thread: thread._id, forClient: thread.client.equals(reader._id) });
  emitToUser(reader._id.toString(), 'thread:read', { threadId: thread._id.toString() });
}
