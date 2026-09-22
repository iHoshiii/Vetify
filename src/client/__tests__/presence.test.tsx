import ParticipantAvatar from '@/components/messaging/ParticipantAvatar';
import { notePresence, replacePresence, usePresence } from '@/hooks/usePresence';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

function PresenceProbe({ userId }: { userId: string }) {
  return <span>{usePresence(userId) ? 'Online' : 'Offline'}</span>;
}

beforeEach(() => replacePresence([]));

describe('online presence', () => {
  it('updates subscribers when a user connects and disconnects', () => {
    render(<PresenceProbe userId="vet-1" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();

    act(() => notePresence('vet-1', true));
    expect(screen.getByText('Online')).toBeInTheDocument();

    act(() => notePresence('vet-1', false));
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('draws an accessible green indicator on an online avatar', () => {
    render(<ParticipantAvatar name="Dr Reyes" online />);
    expect(screen.getByLabelText('Active now')).toHaveClass('bg-emerald-500');
  });
});
