import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useRealtime } from '../hooks/useRealtime';
import { usePresence, clearPresence } from '../hooks/usePresence';

const state = vi.hoisted(() => ({
  auth: {
    user: { id: 'owner' },
    accessToken: 'first',
    status: 'authenticated',
    isAuthenticated: true,
  },
  listeners: new Map<string, (payload: unknown) => void>(),
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));
vi.mock('../components/providers/AuthProvider', () => ({ useAuth: () => state.auth }));
vi.mock('../lib/socket', () => ({ connectSocket: () => state.socket, disconnectSocket: vi.fn() }));
vi.mock('../hooks/useSocketSession', () => ({ useSocketSession: vi.fn() }));
beforeEach(() => {
  state.auth.user = { id: 'owner' };
  state.auth.accessToken = 'first';
  state.listeners.clear();
  state.socket.on.mockImplementation((name, callback) => state.listeners.set(name, callback));
  state.socket.off.mockImplementation((name) => state.listeners.delete(name));
  clearPresence();
});
afterEach(clearPresence);
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

it('preserves online badges through same-account renewal and clears them on disconnect', () => {
  const hook = renderHook(
    () => {
      useRealtime();
      return usePresence('vet');
    },
    { wrapper }
  );
  act(() => state.listeners.get('presence:snapshot')?.({ userIds: ['vet'] }));
  expect(hook.result.current).toBe(true);
  state.auth.accessToken = 'renewed';
  hook.rerender();
  expect(hook.result.current).toBe(true);
  act(() => state.listeners.get('disconnect')?.({}));
  expect(hook.result.current).toBe(false);
});

it('clears a previous account presence snapshot when switching accounts', () => {
  const hook = renderHook(
    () => {
      useRealtime();
      return usePresence('vet');
    },
    { wrapper }
  );
  act(() => state.listeners.get('presence:snapshot')?.({ userIds: ['vet'] }));
  state.auth.user = { id: 'another' };
  state.auth.accessToken = 'other-token';
  hook.rerender();
  expect(hook.result.current).toBe(false);
});
