export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const KEY = 'vetify_chat_sessions';

export function loadSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  const sessions = loadSessions().filter((s) => s.id !== session.id);
  localStorage.setItem(KEY, JSON.stringify([session, ...sessions].slice(0, 20)));
}

export function deleteSession(id: string): void {
  const sessions = loadSessions().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function newSessionId(): string {
  return `session_${Date.now()}`;
}

export function deriveTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user');
  if (!first) return 'New chat';
  return first.content.length > 40 ? first.content.slice(0, 40) + '…' : first.content;
}
