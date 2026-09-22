import ThreadMenu from '@/components/messaging/ThreadMenu';
import type { Thread } from '@/services/messages.service';
import * as svc from '@/services/messages.service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/messages.service', async (orig) => ({
  ...(await orig<typeof svc>()),
  setThreadState: vi.fn(async (_id: string, state: string) => ({ state })),
}));

const thread: Thread = {
  id: 't1',
  professionalId: 'p1',
  with: { id: 'u2', name: 'Mitz', email: 'm@e.com', avatarUrl: null },
  lastBody: null,
  lastFromYou: false,
  lastAt: null,
  unread: 0,
  muted: false,
  state: 'active',
  otherReadAt: null,
  createdAt: '2026-09-22T00:00:00.000Z',
};

function wrap(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

afterEach(() => vi.clearAllMocks());

describe('ThreadMenu delete', () => {
  it('moves a spam conversation back to Messages', async () => {
    const onCloseThread = vi.fn();
    render(
      wrap(
        <ThreadMenu
          thread={{ ...thread, state: 'spam' }}
          variant="row"
          onDone={vi.fn()}
          onCloseThread={onCloseThread}
        />
      )
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Move to Messages' }));
    await waitFor(() => expect(vi.mocked(svc.setThreadState)).toHaveBeenCalledWith('t1', 'active'));
    expect(onCloseThread).not.toHaveBeenCalled();
  });

  it('closes an open conversation when it is archived from a row', async () => {
    const onCloseThread = vi.fn();
    render(
      wrap(
        <ThreadMenu thread={thread} variant="row" onDone={vi.fn()} onCloseThread={onCloseThread} />
      )
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    await waitFor(() => expect(onCloseThread).toHaveBeenCalledOnce());
  });

  it('fires setThreadState(deleted) when the modal Delete is clicked', async () => {
    const onDone = vi.fn();
    render(wrap(<ThreadMenu thread={thread} variant="row" onDone={onDone} />));

    await userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));
    // The confirm modal is now up; click its Delete.
    const confirm = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirm).getByRole('button', { name: /^delete$/i }));

    await waitFor(() =>
      expect(vi.mocked(svc.setThreadState)).toHaveBeenCalledWith('t1', 'deleted')
    );
    expect(onDone).toHaveBeenCalled();
  });
});
