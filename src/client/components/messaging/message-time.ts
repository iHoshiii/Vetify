import type { Message } from '@/services/messages.service';

const GROUP_WINDOW_MS = 15 * 60 * 1000;

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function shouldShowMessageTime(messages: Message[], index: number): boolean {
  const current = messages[index];
  const next = messages[index + 1];
  if (!current || !next || current.fromYou !== next.fromYou) return true;
  const currentAt = new Date(current.createdAt);
  const nextAt = new Date(next.createdAt);
  if (!sameLocalDay(currentAt, nextAt)) return true;
  return nextAt.getTime() - currentAt.getTime() >= GROUP_WINDOW_MS;
}

export function dateLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameLocalDay(date, today)) return 'Today';
  if (sameLocalDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function startsNewDay(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  return !sameLocalDay(
    new Date(messages[index - 1].createdAt),
    new Date(messages[index].createdAt)
  );
}

export function spansMultipleDays(messages: Message[]): boolean {
  if (messages.length < 2) return false;
  return !sameLocalDay(
    new Date(messages[0].createdAt),
    new Date(messages[messages.length - 1].createdAt)
  );
}

export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function fullTime(iso: string): string {
  return `${dateLabel(iso)} at ${shortTime(iso)}`;
}
