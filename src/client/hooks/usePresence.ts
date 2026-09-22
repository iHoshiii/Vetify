import { useSyncExternalStore } from 'react';

const onlineUsers = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function replacePresence(userIds: string[]): void {
  onlineUsers.clear();
  for (const userId of userIds) onlineUsers.add(userId);
  emit();
}

export function notePresence(userId: string, online: boolean): void {
  if (online) onlineUsers.add(userId);
  else onlineUsers.delete(userId);
  emit();
}

export function clearPresence(): void {
  if (onlineUsers.size === 0) return;
  onlineUsers.clear();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function usePresence(userId: string | null): boolean {
  return useSyncExternalStore(
    subscribe,
    () => Boolean(userId && onlineUsers.has(userId)),
    () => false
  );
}
