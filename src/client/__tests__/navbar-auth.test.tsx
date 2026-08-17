import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import SiteHeader from '@/components/navbar/navbar-header';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';

vi.mock('@/lib/auth', () => ({
  readAuthState: vi.fn().mockReturnValue(null),
  writeAuthState: vi.fn(),
  refreshSession: vi.fn(),
  logoutFromServer: vi.fn().mockResolvedValue(undefined),
}));

/** Stands in for the login form, which does exactly this on success. */
function LoginTrigger() {
  const { setSession } = useAuth();
  return (
    <button
      onClick={() =>
        setSession({
          accessToken: 'token',
          user: {
            id: '1',
            email: 'ada@example.com',
            name: 'Ada',
            provider: 'local',
            avatarUrl: null,
            emailVerified: true,
          },
        })
      }
    >
      trigger login
    </button>
  );
}

function renderHeader() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SiteHeader />
        <LoginTrigger />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('navbar auth reactivity', () => {
  it('shows the login and signup links while anonymous', () => {
    renderHeader();

    expect(screen.getAllByText('Log in').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sign up').length).toBeGreaterThan(0);
  });

  it('drops them the moment a session arrives, with no reload', () => {
    renderHeader();
    fireEvent.click(screen.getByText('trigger login'));

    // The regression this pins: the header used to snapshot localStorage on
    // mount, so these stayed on screen until the page was reloaded.
    expect(screen.queryByText('Log in')).toBeNull();
    expect(screen.queryByText('Sign up')).toBeNull();
    expect(screen.getAllByText('Find Vets').length).toBeGreaterThan(0);
  });
});
