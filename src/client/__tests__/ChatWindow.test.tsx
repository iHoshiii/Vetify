import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatWindow from '../components/chat-ui/chat-windows';

vi.mock('../services/chat.service', () => ({
  sendMessage: vi.fn().mockResolvedValue('Hello!'),
}));

vi.mock('../lib/auth', () => ({
  readAuthState: vi.fn().mockReturnValue(null),
}));

const defaultProps = {
  messages: [],
  onMessagesChange: vi.fn(),
};

describe('ChatWindow', () => {
  it('renders the input field', () => {
    render(<ChatWindow {...defaultProps} />);
    expect(screen.getByPlaceholderText(/ask about your pet/i)).toBeDefined();
  });

  it('renders the send button', () => {
    render(<ChatWindow {...defaultProps} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDefined();
  });

  it('calls onMessagesChange on send', () => {
    const onMessagesChange = vi.fn();
    render(<ChatWindow messages={[]} onMessagesChange={onMessagesChange} />);
    const input = screen.getByPlaceholderText(/ask about your pet/i);
    fireEvent.change(input, { target: { value: 'Is my dog healthy?' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(onMessagesChange).toHaveBeenCalledWith([
      { role: 'user', content: 'Is my dog healthy?' },
    ]);
  });
});
