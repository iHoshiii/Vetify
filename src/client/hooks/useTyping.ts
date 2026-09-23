import { useSyncExternalStore } from 'react';

// Which threads the far side is typing in right now. Ephemeral, so it lives outside the query cache.
const typing = new Map<string, number>();
// The pending self-expiry timer per thread, so a fresh ping can reset it rather than stack timers.
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
// A "typing" ping that is not refreshed self-clears, so a dropped stop-event never leaves the dots stuck on.
const EXPIRY_MS = 6000;

function emit(): void {
  for (const listener of listeners) listener();
}

function clearThread(threadId: string): void {
  const timer = timers.get(threadId);
  if (timer !== undefined) clearTimeout(timer);
  timers.delete(threadId);
  typing.delete(threadId);
}

// Records the far side's state for one thread and schedules its own expiry, so it fades without a stop-event.
export function noteTyping(threadId: string, isTyping: boolean): void {
  clearThread(threadId);
  if (isTyping) {
    typing.set(threadId, Date.now() + EXPIRY_MS);
    // useSyncExternalStore only re-reads on a store event, so the expiry has to fire one itself.
    timers.set(
      threadId,
      setTimeout(() => {
        clearThread(threadId);
        emit();
      }, EXPIRY_MS)
    );
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

// True while the other party is typing in this thread and the last ping has not aged out.
export function useTyping(threadId: string | null): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (!threadId) return false;
      const until = typing.get(threadId);
      return until !== undefined && until > Date.now();
    },
    () => false
  );
}
