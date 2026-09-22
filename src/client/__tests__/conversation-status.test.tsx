import ConversationStatus from '@/components/messaging/ConversationStatus';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('ConversationStatus', () => {
  it('shows a send failure beside the composer', () => {
    render(
      <ConversationStatus typing={false} error="Please wait a moment before sending again." />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please wait a moment before sending again.'
    );
  });
});
