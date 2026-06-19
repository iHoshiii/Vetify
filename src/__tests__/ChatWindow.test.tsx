import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChatWindow from '../components/ChatWindow';

vi.stubGlobal('fetch', vi.fn());

describe('ChatWindow', () => {
  it('renders the input field', () => {
    render(<ChatWindow />);
    expect(screen.getByPlaceholderText(/ask about your pet/i)).toBeDefined();
  });

  it('renders the send button', () => {
    render(<ChatWindow />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDefined();
  });

  it('adds a user message on send', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Hello!' }),
    });

    render(<ChatWindow />);
    const input = screen.getByPlaceholderText(/ask about your pet/i);
    fireEvent.change(input, { target: { value: 'Is my dog healthy?' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByText('Is my dog healthy?')).toBeDefined();
  });
});
