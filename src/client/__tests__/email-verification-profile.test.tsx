import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/lib/auth-storage';
import ProfileForm from '@/components/settings/consumer/ProfileForm';
import { requestEmailVerification } from '@/services/email-verification.service';

const state = vi.hoisted(() => ({ user: null as AuthUser | null, mutate: vi.fn() }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/useAccount', () => ({
  useUpdateProfile: () => ({ mutate: state.mutate, reset: vi.fn(), isPending: false }),
}));
vi.mock('@/services/email-verification.service', () => ({ requestEmailVerification: vi.fn() }));

function Form() {
  return (
    <MemoryRouter>
      <ProfileForm />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  state.user = {
    id: 'owner',
    name: 'Owner',
    email: 'owner@example.test',
    role: 'user',
    provider: 'local',
    emailVerified: false,
    avatarUrl: 'https://example.test/avatar.png',
  };
});

describe('profile email verification', () => {
  it('resends without submitting profile edits and preserves name/avatar drafts during status updates', async () => {
    let finish!: (response: { message: string }) => void;
    vi.mocked(requestEmailVerification).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const page = render(<Form />);
    expect(screen.getByText('Verification pending')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Draft name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    expect(screen.getByRole('button', { name: 'Sending verification link...' })).toBeDisabled();
    expect(state.mutate).not.toHaveBeenCalled();
    await act(async () => finish({ message: 'A verification link has been sent.' }));
    expect(screen.getByRole('status')).toHaveTextContent('A verification link has been sent.');
    state.user = { ...state.user!, emailVerified: true };
    page.rerender(<Form />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Resend verification email' })
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toHaveValue('Draft name');
    expect(screen.queryByRole('img', { name: 'Your profile' })).not.toBeInTheDocument();
  });

  it.each([
    { provider: 'local', emailVerified: true },
    { provider: 'google', emailVerified: false },
  ] as const)('hides resend for $provider with verified=$emailVerified', (change) => {
    state.user = { ...state.user!, ...change };
    render(<Form />);
    expect(
      screen.queryByRole('button', { name: 'Resend verification email' })
    ).not.toBeInTheDocument();
    expect(requestEmailVerification).not.toHaveBeenCalled();
  });

  it('shows cooldown/failure messages and enables another attempt', async () => {
    vi.mocked(requestEmailVerification).mockRejectedValueOnce(
      new Error('Please wait before requesting another verification email.')
    );
    vi.mocked(requestEmailVerification).mockResolvedValue({
      message: 'A verification link has been sent.',
    });
    render(<Form />);
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please wait');
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'A verification link has been sent.'
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
