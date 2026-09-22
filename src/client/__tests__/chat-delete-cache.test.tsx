import { messageKeys, useOpenThread, useSendMessage, useSetThreadState } from '@/hooks/useMessages';
import type { MessagePage, Thread, ThreadPage } from '@/services/messages.service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const thread: Thread = {
  id: 't1',
  professionalId: 'p1',
  with: { id: 'u2', name: 'Mitz', email: 'mitz@example.com', avatarUrl: null },
  lastBody: null,
  lastFromYou: false,
  lastAt: null,
  unread: 0,
  muted: false,
  state: 'active',
  otherReadAt: null,
  createdAt: '2026-09-22T00:00:00.000Z',
};

vi.mock('@/services/messages.service', () => ({
  openThread: vi.fn(async () => thread),
  sendMessage: vi.fn(async () => ({ id: 'sent', createdAt: new Date().toISOString() })),
  setThreadState: vi.fn(async (_threadId: string, state: string) => ({ state })),
}));

// One page of stale bubbles left in the cache before the caller deletes.
const stalePage: MessagePage = {
  items: [
    {
      id: 'old',
      threadId: 't1',
      body: 'HELLO',
      fromYou: true,
      editedAt: null,
      unsentAt: null,
      createdAt: thread.createdAt,
    },
  ],
  page: 1,
  limit: 30,
  total: 1,
  pages: 1,
};

function harness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(messageKeys.thread('t1', {}), stalePage);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

function page(items: Thread[]): ThreadPage {
  return { items, page: 1, limit: 20, total: items.length, pages: 1 };
}

afterEach(() => vi.clearAllMocks());

describe('deleting a conversation clears its cached messages', () => {
  it('evicts the thread page so a reopen cannot flash old bubbles', async () => {
    const { client, wrapper } = harness();
    const { result } = renderHook(() => useSetThreadState(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ threadId: 't1', state: 'deleted' });
    });

    await waitFor(() => expect(client.getQueryData(messageKeys.thread('t1', {}))).toBeUndefined());
  });

  it('drops the page again when the same thread is reopened', async () => {
    const { client, wrapper } = harness();
    const { result } = renderHook(() => useOpenThread(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('p1');
    });

    await waitFor(() => expect(client.getQueryData(messageKeys.thread('t1', {}))).toBeUndefined());
  });
});

describe('conversation shelf cache', () => {
  it('moves an archived conversation immediately without waiting for a refetch', async () => {
    const { client, wrapper } = harness();
    const activeKey = messageKeys.threads('mine', { state: 'active' });
    const archiveKey = messageKeys.threads('mine', { state: 'archived' });
    client.setQueryData(activeKey, page([thread]));
    client.setQueryData(archiveKey, page([]));
    const { result } = renderHook(() => useSetThreadState(), { wrapper });

    await act(() => result.current.mutateAsync({ threadId: 't1', state: 'archived' }));
    expect(client.getQueryData<ThreadPage>(activeKey)?.items).toHaveLength(0);
    expect(client.getQueryData<ThreadPage>(archiveKey)?.items[0].state).toBe('archived');
  });

  it('moves an archived conversation to Messages after sending', async () => {
    const { client, wrapper } = harness();
    const activeKey = messageKeys.threads('mine', { state: 'active' });
    const archiveKey = messageKeys.threads('mine', { state: 'archived' });
    client.setQueryData(activeKey, page([]));
    client.setQueryData(archiveKey, page([{ ...thread, state: 'archived' }]));
    const { result } = renderHook(() => useSendMessage('t1'), { wrapper });

    await act(() => result.current.mutateAsync('hello'));
    expect(client.getQueryData<ThreadPage>(activeKey)?.items[0].state).toBe('active');
    expect(client.getQueryData<ThreadPage>(archiveKey)?.items).toHaveLength(0);
  });
});
