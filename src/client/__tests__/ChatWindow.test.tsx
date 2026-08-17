import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatWindow from '../components/chat-ui/chat-windows';
import { AuthProvider } from '../components/providers/AuthProvider';

vi.mock('../services/chat.service', () => ({
  sendMessage: vi.fn().mockResolvedValue('Hello!'),
}));

vi.mock('../lib/auth', () => ({
  readAuthState: vi.fn().mockReturnValue(null),
  writeAuthState: vi.fn(),
  refreshSession: vi.fn(),
  logoutFromServer: vi.fn().mockResolvedValue(undefined),
}));

const defaultProps = {
  messages: [],
  onMessagesChange: vi.fn(),
};

/** Needs the provider for the session id and a router for the quota links. */
function renderChat(props = defaultProps) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ChatWindow {...props} />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  // The anonymous allowance persists in localStorage; without this the counter
  // carries between tests in this file.
  window.localStorage.clear();
});

describe('ChatWindow', () => {
  it('renders the input field', () => {
    renderChat();
    expect(screen.getByPlaceholderText(/ask about your pet/i)).toBeDefined();
  });

  it('renders the send button', () => {
    renderChat();
    expect(screen.getByRole('button', { name: /send/i })).toBeDefined();
  });

  it('calls onMessagesChange on send', () => {
    const onMessagesChange = vi.fn();
    renderChat({ messages: [], onMessagesChange });
    const input = screen.getByPlaceholderText(/ask about your pet/i);
    fireEvent.change(input, { target: { value: 'Is my dog healthy?' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(onMessagesChange).toHaveBeenCalledWith([
      { role: 'user', content: 'Is my dog healthy?' },
    ]);
  });
});
