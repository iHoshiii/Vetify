import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import SiteHeader from '@/components/navbar/navbar-header';
import FloatingSettings from '@/components/FloatingSettings';
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
import type { UserRole } from '@shared/schemas';

vi.mock('@/lib/auth', () => ({
  readAuthState: vi.fn().mockReturnValue(null),
  writeAuthState: vi.fn(),
  refreshSession: vi.fn(),
  logoutFromServer: vi.fn().mockResolvedValue(undefined),
}));

/** Stands in for the login form, which does exactly this on success. */
function LoginTrigger({ role = 'user' }: { role?: UserRole }) {
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
            role,
          },
        })
      }
    >
      trigger login
    </button>
  );
}

function renderHeader(role: UserRole = 'user') {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SiteHeader />
        <LoginTrigger role={role} />
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

  it('offers no way into the console to an ordinary account', () => {
    renderHeader();
    fireEvent.click(screen.getByText('trigger login'));

    expect(screen.queryByLabelText('Open the admin console')).toBeNull();
  });

  it('gives an admin their avatar, which is the link to the console', () => {
    renderHeader('admin');
    fireEvent.click(screen.getByText('trigger login'));

    const avatar = screen.getByLabelText('Open the admin console');

    expect(avatar).toHaveAttribute('href', '/admin');
    // The initial is decorative — the label above is what a screen reader gets —
    // but it is what a sighted admin recognises the circle by.
    expect(avatar).toHaveTextContent('A');
  });
});

describe('floating settings auth reactivity', () => {
  it('stays hidden while anonymous and appears once a session arrives', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <FloatingSettings />
          <LoginTrigger />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByLabelText('Settings')).toBeNull();

    fireEvent.click(screen.getByText('trigger login'));

    expect(screen.getByLabelText('Settings')).toBeDefined();
    expect(screen.getAllByText('ada@example.com').length).toBeGreaterThan(0);
  });
});
