import { apiFetch } from './api';

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
  createdAt: string;
};

export type Message = {
  id: string;
  threadId: string;
  body: string;
  fromYou: boolean;
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
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ThreadSide = 'mine' | 'incoming';

export type PageParams = { page?: number; limit?: number };

function queryOf(params: PageParams): string {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));

  const query = search.toString();
  return query ? `?${query}` : '';
}

// GET /api/v1/messages/{mine,incoming} — the caller's threads on the side they asked for.
export async function listThreads(side: ThreadSide, params: PageParams = {}, signal?: AbortSignal) {
  return await apiFetch<ThreadPage>(`/messages/${side}${queryOf(params)}`, { signal });
}

// GET /api/v1/messages/unread — the caller's total unread, for the launcher badge.
export async function getUnreadCount(signal?: AbortSignal) {
  const { unread } = await apiFetch<{ unread: number }>('/messages/unread', { signal });
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
