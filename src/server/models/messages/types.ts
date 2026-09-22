import { ObjectId, type IndexDescription } from 'mongodb';

import type { ThreadState } from '@shared/schemas';

export const THREADS_COLLECTION = 'threads';
export const MESSAGES_COLLECTION = 'messages';

// A private conversation between one owner and one vet, both stored as user accounts.
export type ThreadDocument = {
  _id: ObjectId;
  // The listing behind the vet, kept so a thread row can link to the public profile.
  professional: ObjectId;
  // The vet's account, denormalised the same way a booking carries it, so "my threads" reads off the signed-in id.
  professionalUser: ObjectId;
  client: ObjectId;
  // A copy of the newest message for the list row, so it draws without reading the messages.
  lastBody: string | null;
  lastSender: ObjectId | null;
  lastAt: Date | null;
  // Unread counts, one per side, bumped on send and cleared when that side opens the thread.
  clientUnread: number;
  professionalUnread: number;
  clientMuted?: boolean;
  professionalMuted?: boolean;
  clientReportedAt?: Date | null;
  professionalReportedAt?: Date | null;
  clientDeletedAt?: Date | null;
  professionalDeletedAt?: Date | null;
  // Which shelf each side has filed the thread on. Private to that side, reset to active when the other writes in.
  clientState: ThreadState;
  professionalState: ThreadState;
  // When each side last opened the thread, so the other can be shown a "Seen" under their last message.
  clientReadAt: Date | null;
  professionalReadAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageDocument = {
  _id: ObjectId;
  thread: ObjectId;
  sender: ObjectId;
  body: string;
  createdAt: Date;
};

// The other person on a thread, as the list and header need them.
export type ThreadParty = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type ThreadView = {
  id: string;
  professionalId: string;
  // The account on the other side, or null if it is gone.
  with: ThreadParty | null;
  lastBody: string | null;
  // True when the newest message was the viewer's own.
  lastFromYou: boolean;
  lastAt: string | null;
  unread: number;
  muted: boolean;
  // The viewer's own shelf, so the panel can offer restore on an archived or spam row.
  state: ThreadState;
  // When the other side last read, so a "Seen" shows under the viewer's last message. Null if never.
  otherReadAt: string | null;
  createdAt: string;
};

export type MessageView = {
  id: string;
  threadId: string;
  body: string;
  // True when the viewer sent it, so the bubble sides correctly without exposing ids.
  fromYou: boolean;
  createdAt: string;
};

export type ThreadPage = {
  items: ThreadView[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type MessagePage = {
  items: MessageView[];
  // Refreshed with the messages so an open conversation can update its receipt in real time.
  otherReadAt: string | null;
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export const THREAD_INDEXES: IndexDescription[] = [
  // One thread per owner-and-vet pair. A second open of the same vet finds this one rather than making a duplicate.
  { key: { client: 1, professionalUser: 1 }, unique: true },
  // The owner's inbox: my threads, most recently active first.
  { key: { client: 1, lastAt: -1 } },
  // The vet's inbox.
  { key: { professionalUser: 1, lastAt: -1 } },
];

export const MESSAGE_INDEXES: IndexDescription[] = [
  // One thread's messages, newest first, the page a conversation is read from.
  { key: { thread: 1, createdAt: -1 } },
];
