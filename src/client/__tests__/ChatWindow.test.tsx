import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

/** ChatWindow reads the session id from context, so it needs the provider. */
function renderChat(props = defaultProps) {
  return render(
    <AuthProvider>
      <ChatWindow {...props} />
    </AuthProvider>
  );
}

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
