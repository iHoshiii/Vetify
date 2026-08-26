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

  it('keeps the console out of the header, even for an admin', () => {
    const { container } = renderHeader('admin');
    fireEvent.click(screen.getByText('trigger login'));

    // The entry lives in the settings tray now. Neither the desktop actions nor
    // the mobile menu carries a second one.
    expect(screen.queryByText(/admin console/i)).toBeNull();
    expect(container.querySelector('a[href="/admin"]')).toBeNull();
  });
});

function renderTray(role: UserRole = 'user') {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <FloatingSettings />
        <LoginTrigger role={role} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('floating settings auth reactivity', () => {
  it('stays hidden while anonymous and appears once a session arrives', () => {
    renderTray();

    expect(screen.queryByLabelText('Settings')).toBeNull();

    fireEvent.click(screen.getByText('trigger login'));

    expect(screen.getByLabelText('Settings')).toBeDefined();
    expect(screen.getAllByText('ada@example.com').length).toBeGreaterThan(0);
  });

  it('offers an admin the console, immediately above the way out', () => {
    renderTray('admin');
    fireEvent.click(screen.getByText('trigger login'));
    fireEvent.click(screen.getByLabelText('Settings'));

    const link = screen.getByRole('link', { name: 'Admin console' });
    const logout = screen.getByText('Log Out');

    expect(link).toHaveAttribute('href', '/admin');
    // Order matters and was asked for: the two session actions sit together, with
    // the destructive one last.
    expect(link.compareDocumentPosition(logout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('offers it to nobody else', () => {
    renderTray();
    fireEvent.click(screen.getByText('trigger login'));
    fireEvent.click(screen.getByLabelText('Settings'));

    // Hiding a link, not a permission: /admin is gated by RequireRole and every
    // endpoint behind it re-reads the stored role.
    expect(screen.queryByText('Admin console')).toBeNull();
    expect(screen.getByText('Log Out')).toBeInTheDocument();
  });
});
