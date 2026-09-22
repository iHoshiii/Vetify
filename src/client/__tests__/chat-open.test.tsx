import VetCard from '@/pages/book-appointment/_components/vet-card';
import ChatPanel from '@/components/messaging/ChatPanel';
import { ChatProvider } from '@/components/messaging/ChatProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import ThreadList from '@/components/messaging/ThreadList';
import { ApiError } from '@/services/api';
import * as messagesService from '@/services/messages.service';
import type { PublicProfessional } from '@/services/professionals.service';
import type { Thread } from '@/services/messages.service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
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
  createdAt: new Date().toISOString(),
};

vi.mock('@/services/messages.service', () => ({
  openThread: vi.fn(async () => thread),
  listThreads: vi.fn(async () => ({ items: [], page: 1, limit: 20, total: 0, pages: 1 })),
  listMessages: vi.fn(async () => ({ items: [], page: 1, limit: 30, total: 0, pages: 1 })),
  getUnreadCount: vi.fn(async () => 0),
  sendMessage: vi.fn(async () => ({ id: 'm1', createdAt: new Date().toISOString() })),
  setThreadRead: vi.fn(async (_threadId: string, unread: boolean) => ({ unread })),
  setThreadMuted: vi.fn(async (_threadId: string, muted: boolean) => ({ muted })),
  reportThread: vi.fn(async () => ({ reported: true })),
  setThreadState: vi.fn(async () => ({ state: 'active' })),
}));

vi.mock('@/lib/socket', () => ({
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(() => null),
  emitTyping: vi.fn(),
}));

const vet = {
  id: 'p1',
  name: 'Mitz',
  clinicName: 'Vetify Test Clinic',
  clinicAddress: 'Solano',
  addresses: [],
  specialties: [],
  yearsExperience: 2,
  hourlyRate: 50,
  ratingAverage: 0,
  ratingCount: 0,
  avatarUrl: null,
} as unknown as PublicProfessional;

// jsdom has no layout engine, so the auto-scroll effect needs a stub.
Element.prototype.scrollIntoView = vi.fn();

afterEach(() => vi.clearAllMocks());

describe('the Chat button on a vet card', () => {
  it('opens the conversation with that vet in the panel', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AuthProvider>
            <ChatProvider>
              <VetCard vet={vet} onPick={() => {}} picked={false} />
              <ChatPanel />
            </ChatProvider>
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: /chat/i }));

    // Once the thread resolves, the composer for that conversation is on screen.
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Write a message…')).toBeInTheDocument()
    );
  });
});

describe("a normal user's thread list", () => {
  it('shows a conversation the server returns for their own side', async () => {
    vi.mocked(messagesService.listThreads).mockResolvedValueOnce({
      items: [{ ...thread, with: { ...thread.with!, name: 'Vetify Test Clinic' } }],
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ThreadList side="mine" onOpen={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Vetify Test Clinic')).toBeInTheDocument());
  });

  it('reports a failed load instead of showing an empty inbox', async () => {
    // A 4xx is not retried, so the error surfaces on the first attempt.
    vi.mocked(messagesService.listThreads).mockRejectedValue(new ApiError(401, 'Session expired'));

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ThreadList side="mine" onOpen={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText('Session expired')).toBeInTheDocument());
    expect(screen.queryByText('No conversations yet.')).not.toBeInTheDocument();
  });
});
