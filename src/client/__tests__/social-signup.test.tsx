import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SignupPage from '@/pages/signup/signup-page';
import { startSocialLogin } from '@/lib/auth';

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: null, accessToken: null, setSession: vi.fn(), logout: vi.fn() }),
}));
vi.mock('@/lib/auth', async (original) => ({
  ...(await original<typeof import('@/lib/auth')>()),
  startSocialLogin: vi.fn(),
}));
vi.mock('@/pages/signup/_components/signup-form', () => ({
  default: () => null,
}));

afterEach(() => vi.clearAllMocks());

function show(reason?: string) {
  const search = reason ? `?error=oauth&reason=${encodeURIComponent(reason)}` : '';
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/signup', search, state: { from: '/book-appointment' } }]}
    >
      <SignupPage />
    </MemoryRouter>
  );
}

describe('social signup feedback', () => {
  it.each(['google', 'facebook', 'tiktok'] as const)('starts %s with signup intent', (provider) => {
    show();
    fireEvent.click(screen.getByRole('button', { name: new RegExp(provider, 'i') }));
    expect(startSocialLogin).toHaveBeenCalledWith(provider, '/book-appointment', 'signup');
  });

  it.each(['Google', 'Facebook', 'TikTok'])(
    'explains an existing %s account and offers login',
    (provider) => {
      show(`account-exists-${provider.toLowerCase()}`);
      expect(screen.getByRole('alert')).toHaveTextContent(
        `This ${provider} account is already connected to Vetify. Please log in with ${provider}.`
      );
      expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    }
  );

  it('keeps an unknown query reason out of the displayed message', () => {
    show('<script>untrusted</script>');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not complete signup. Please try again.'
    );
    expect(screen.queryByText(/untrusted/)).toBeNull();
  });
});
