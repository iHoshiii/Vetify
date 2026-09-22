import MessageBubble from '@/components/messaging/MessageBubble';
import type { Message } from '@/services/messages.service';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

function recentMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'message-1',
    threadId: 'thread-1',
    body: 'Hello',
    fromYou: true,
    editedAt: null,
    unsentAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderBubble(message = recentMessage(), showTime = false) {
  const onEdit = vi.fn().mockResolvedValue(undefined);
  const onDelete = vi.fn().mockResolvedValue(undefined);
  render(
    <MessageBubble
      message={message}
      mineAvatar={{ name: 'You' }}
      otherAvatar={{ name: 'Vet' }}
      showTime={showTime}
      busy={false}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
  return { onEdit, onDelete };
}

describe('MessageBubble actions and timestamps', () => {
  it('reveals the full local date and time when the bubble is clicked', () => {
    renderBubble();
    expect(screen.queryByText(/Today at/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show message date and time' }));
    expect(screen.getByText(/Today at/)).toBeInTheDocument();
    expect(screen.getByTestId('message-meta')).toHaveClass('absolute', 'whitespace-nowrap');
  });

  it('keeps the message options button visible for an actionable message', () => {
    renderBubble();
    expect(screen.getByRole('button', { name: 'Message options' })).not.toHaveClass('opacity-0');
  });

  it('edits an owned recent message', async () => {
    const { onEdit } = renderBubble();
    fireEvent.click(screen.getByRole('button', { name: 'Message options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Updated hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save edited message' }));
    await waitFor(() => expect(onEdit).toHaveBeenCalledWith('Updated hello'));
  });

  it('confirms before unsending', async () => {
    const { onDelete } = renderBubble();
    fireEvent.click(screen.getByRole('button', { name: 'Message options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unsend' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unsend' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledOnce());
  });

  it('offers remove for me on a received message', () => {
    renderBubble(recentMessage({ fromYou: false }));
    fireEvent.click(screen.getByRole('button', { name: 'Message options' }));
    expect(screen.getByRole('button', { name: 'Remove for me' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('allows old owned messages to be unsent but not edited', () => {
    renderBubble(recentMessage({ createdAt: new Date(Date.now() - 16 * 60_000).toISOString() }));
    fireEvent.click(screen.getByRole('button', { name: 'Message options' }));
    expect(screen.getByRole('button', { name: 'Unsend' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
