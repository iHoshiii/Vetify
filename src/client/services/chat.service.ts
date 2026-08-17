import { apiFetch } from './api';

export type ChatRole = 'user' | 'assistant';

export type ChatHistoryItem = {
  role: ChatRole;
  content: string;
};

export type SendMessageArgs = {
  message: string;
  sessionId: string;
  history: ChatHistoryItem[];
  model?: string;
  signal?: AbortSignal;
};

export type ChatReply = {
  reply: string;
  /** Present only for unauthenticated callers: the server's authoritative count. */
  anonRemaining?: number;
};

/** POST /api/v1/chat — the assistant's reply, plus any allowance left. */
export async function sendMessage({
  message,
  sessionId,
  history,
  model,
  signal,
}: SendMessageArgs): Promise<ChatReply> {
  return apiFetch<ChatReply>('/chat', {
    method: 'POST',
    body: { message, session_id: sessionId, history, ...(model ? { model } : {}) },
    signal,
  });
}
