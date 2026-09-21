import type { ObjectId } from 'mongodb';

import type {
  MessageDocument,
  MessagePage,
  MessageView,
  ThreadDocument,
  ThreadParty,
  ThreadPage,
  ThreadView,
} from './types';

// Which of a thread's two accounts is not the one reading it. The party to fetch and label.
export function otherPartyOf(thread: ThreadDocument, viewer: ObjectId): string {
  return thread.client.equals(viewer)
    ? thread.professionalUser.toString()
    : thread.client.toString();
}

export function toThreadView(input: {
  thread: ThreadDocument;
  viewer: ObjectId;
  party: ThreadParty | null;
}): ThreadView {
  const { thread, viewer, party } = input;
  const isClient = thread.client.equals(viewer);

  return {
    id: thread._id.toString(),
    professionalId: thread.professional.toString(),
    with: party,
    lastBody: thread.lastBody,
    lastFromYou: thread.lastSender?.equals(viewer) ?? false,
    lastAt: thread.lastAt?.toISOString() ?? null,
    unread: isClient ? thread.clientUnread : thread.professionalUnread,
    createdAt: thread.createdAt.toISOString(),
  };
}

export function toThreadPage(input: {
  items: ThreadDocument[];
  viewer: ObjectId;
  parties: Map<string, ThreadParty>;
  total: number;
  page: number;
  limit: number;
}): ThreadPage {
  const { items, viewer, parties, total, page, limit } = input;

  return {
    items: items.map((thread) =>
      toThreadView({ thread, viewer, party: parties.get(otherPartyOf(thread, viewer)) ?? null })
    ),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function toMessageView(message: MessageDocument, viewer: ObjectId): MessageView {
  return {
    id: message._id.toString(),
    threadId: message.thread.toString(),
    body: message.body,
    fromYou: message.sender.equals(viewer),
    createdAt: message.createdAt.toISOString(),
  };
}

// A page of messages, reversed to oldest-first so the reader appends downward.
export function toMessagePage(input: {
  items: MessageDocument[];
  viewer: ObjectId;
  total: number;
  page: number;
  limit: number;
}): MessagePage {
  const { items, viewer, total, page, limit } = input;

  return {
    items: [...items].reverse().map((message) => toMessageView(message, viewer)),
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
