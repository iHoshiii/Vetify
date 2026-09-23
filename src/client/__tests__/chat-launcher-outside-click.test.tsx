import ChatLauncher from '@/components/messaging/ChatLauncher';
import { ChatContext, type ChatContextValue } from '@/components/messaging/chat-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Uma', email: 'u@e.com', role: 'user' } }),
}));

vi.mock('@/hooks/useMessages', () => ({ useUnreadCount: () => ({ data: 0 }) }));

// The panel body is irrelevant here; we only test the launcher's outside-click guard.
vi.mock('@/components/messaging/ChatPanel', () => ({ default: () => <div data-testid="panel" /> }));

function ctx(closePanel: () => void): ChatContextValue {
  return {
    open: true,
    activeThread: null,
    starting: false,
    openPanel: vi.fn(),
    closePanel,
    openThread: vi.fn(),
    startWithVet: vi.fn(),
    startError: null,
  };
}

function mount(closePanel: () => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ChatContext.Provider value={ctx(closePanel)}>
          <ChatLauncher />
        </ChatContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.clearAllMocks();
  document.body.querySelectorAll('[role="dialog"],[role="alertdialog"]').forEach((n) => n.remove());
});

describe('ChatLauncher outside-click', () => {
  it.each(['alertdialog', 'dialog'])(
    'does not close the panel when the click is inside a portaled %s',
    (role) => {
      const closePanel = vi.fn();
      mount(closePanel);

      // Modals (delete confirm, vet picker) render outside the launcher box.
      const dialog = document.createElement('div');
      dialog.setAttribute('role', role);
      const button = document.createElement('button');
      dialog.appendChild(button);
      document.body.appendChild(dialog);

      fireEvent.mouseDown(button);

      expect(closePanel).not.toHaveBeenCalled();
    }
  );

  it('still closes the panel on a genuine outside click', () => {
    const closePanel = vi.fn();
    mount(closePanel);

    fireEvent.mouseDown(document.body);

    expect(closePanel).toHaveBeenCalledTimes(1);
  });
});
