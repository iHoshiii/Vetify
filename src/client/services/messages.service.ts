import type { ThreadState } from '@shared/schemas';

import { apiFetch } from './api';

export type { ThreadState };

// Which shelves the panel can list, in tab order. Deleted rows never show, so they are omitted.
export const THREAD_SHELVES = ['active', 'archived', 'spam'] as const;

// The account on the other side of a thread.
export type ThreadParty = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

// A conversation as one side reads it, matching the server's ThreadView.
export type Thread = {
  id: string;
  professionalId: string;
  with: ThreadParty | null;
  lastBody: string | null;
  lastFromYou: boolean;
  lastAt: string | null;
  unread: number;
  muted: boolean;
  state: ThreadState;
  otherReadAt: string | null;
  createdAt: string;
};

export type Message = {
  id: string;
  threadId: string;
  body: string;
  fromYou: boolean;
  editedAt: string | null;
  unsentAt: string | null;
  createdAt: string;
};

export type ThreadPage = {
  items: Thread[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type MessagePage = {
  items: Message[];
  otherReadAt?: string | null;
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ThreadSide = 'mine' | 'incoming';

// A shelf other than active is asked for by name; active is the default the server assumes.
export type PageParams = { page?: number; limit?: number; state?: ThreadState };

function queryOf(params: PageParams): string {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.state && params.state !== 'active') search.set('state', params.state);

  const query = search.toString();
  return query ? `?${query}` : '';
}

// GET /api/v1/messages/{mine,incoming} — the caller's threads on the side they asked for.
export async function listThreads(side: ThreadSide, params: PageParams = {}, signal?: AbortSignal) {
  return await apiFetch<ThreadPage>(`/messages/${side}${queryOf(params)}`, { signal });
}

// PATCH /api/v1/messages/:id/state — file the caller's own copy on a shelf.
export async function setThreadState(threadId: string, state: ThreadState) {
  return await apiFetch<{ state: ThreadState }>(`/messages/${encodeURIComponent(threadId)}/state`, {
    method: 'PATCH',
    body: { state },
  });
}

export async function setThreadRead(threadId: string, unread: boolean) {
  return await apiFetch<{ unread: boolean }>(`/messages/${encodeURIComponent(threadId)}/read`, {
    method: 'PATCH',
    body: { unread },
  });
}

export async function setThreadMuted(threadId: string, muted: boolean) {
  return await apiFetch<{ muted: boolean }>(`/messages/${encodeURIComponent(threadId)}/mute`, {
    method: 'PATCH',
    body: { muted },
  });
}

export async function reportThread(threadId: string) {
  return await apiFetch<{ reported: true }>(`/messages/${encodeURIComponent(threadId)}/report`, {
    method: 'POST',
  });
}

// GET /api/v1/messages/unread — the caller's total unread, for the launcher badge.
export async function getUnreadCount(side?: ThreadSide, signal?: AbortSignal) {
  const query = side ? `?side=${side}` : '';
  const { unread } = await apiFetch<{ unread: number }>(`/messages/unread${query}`, { signal });
  return unread;
}

// POST /api/v1/messages — open or reuse the thread with a vet.
export async function openThread(professionalId: string) {
  const { thread } = await apiFetch<{ thread: Thread }>('/messages', {
    method: 'POST',
    body: { professionalId },
  });
  return thread;
}

// GET /api/v1/messages/:id/messages — one page of a thread, oldest-first, marking the caller's side read.
export async function listMessages(
  threadId: string,
  params: PageParams = {},
  signal?: AbortSignal
) {
  return await apiFetch<MessagePage>(
    `/messages/${encodeURIComponent(threadId)}/messages${queryOf(params)}`,
    { signal }
  );
}

// POST /api/v1/messages/:id/messages — send into a thread the caller is part of.
export async function sendMessage(threadId: string, body: string) {
  const { message } = await apiFetch<{ message: { id: string; createdAt: string } }>(
    `/messages/${encodeURIComponent(threadId)}/messages`,
    { method: 'POST', body: { body } }
  );
  return message;
}

export async function editMessage(threadId: string, messageId: string, body: string) {
  const { message } = await apiFetch<{ message: Message }>(
    `/messages/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
    { method: 'PATCH', body: { body } }
  );
  return message;
}

export async function unsendMessage(threadId: string, messageId: string) {
  const { message } = await apiFetch<{ message: Message }>(
    `/messages/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
    { method: 'DELETE' }
  );
  return message;
}

export async function sendTyping(threadId: string, typing: boolean) {
  return await apiFetch<{ delivered: true }>(`/messages/${encodeURIComponent(threadId)}/typing`, {
    method: 'POST',
    body: { typing },
  });
}
