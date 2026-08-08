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

/** POST /api/v1/chat — returns the assistant's reply text. */
export async function sendMessage({
  message,
  sessionId,
  history,
  model,
  signal,
}: SendMessageArgs): Promise<string> {
  const { reply } = await apiFetch<{ reply: string }>('/chat', {
    method: 'POST',
    body: { message, session_id: sessionId, history, ...(model ? { model } : {}) },
    signal,
  });

  return reply;
}
