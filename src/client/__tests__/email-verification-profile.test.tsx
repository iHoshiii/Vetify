import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/lib/auth-storage';
import ProfileForm from '@/components/settings/consumer/ProfileForm';

const state = vi.hoisted(() => ({ user: null as AuthUser | null, mutate: vi.fn() }));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/hooks/useAccount', () => ({
  useUpdateProfile: () => ({ mutate: state.mutate, reset: vi.fn(), isPending: false }),
}));

function Form() {
  return (
    <MemoryRouter initialEntries={['/settings/profile']}>
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
  it('links to code confirmation without saving drafts and preserves edits during status updates', () => {
    const page = render(<Form />);
    expect(screen.getByText('Verification pending')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Draft name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    const link = screen.getByRole('link', { name: 'Verify email' });
    expect(link).toHaveAttribute('href', '/signup');
    fireEvent.click(link);
    expect(state.mutate).not.toHaveBeenCalled();
    state.user = { ...state.user!, emailVerified: true };
    page.rerender(<Form />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Verify email' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Display name')).toHaveValue('Draft name');
    expect(screen.queryByRole('img', { name: 'Your profile' })).not.toBeInTheDocument();
  });

  it.each([
    { provider: 'local', emailVerified: true },
    { provider: 'google', emailVerified: false },
  ] as const)('hides confirmation for $provider with verified=$emailVerified', (change) => {
    state.user = { ...state.user!, ...change };
    render(<Form />);
    expect(screen.queryByRole('link', { name: 'Verify email' })).not.toBeInTheDocument();
  });
});
