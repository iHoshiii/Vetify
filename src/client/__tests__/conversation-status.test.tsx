import ConversationStatus from '@/components/messaging/ConversationStatus';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ConversationStatus', () => {
  it('shows a send failure beside the composer', () => {
    render(
      <ConversationStatus
        typing={false}
        error="Please wait a moment before sending again."
        participant={{ name: 'Vet' }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please wait a moment before sending again.'
    );
  });

  it('shows the participant profile beside the typing indicator', () => {
    render(<ConversationStatus typing participant={{ name: 'Vet' }} online />);
    expect(screen.getByLabelText("Vet's profile")).toBeInTheDocument();
    expect(screen.getByLabelText('Active now')).toBeInTheDocument();
  });
});
