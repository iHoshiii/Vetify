import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConsoleLinks from '@/components/settings/console-links';
import type { ProfessionalStatus, UserRole } from '@shared/schemas';

const state = vi.hoisted(() => ({
  role: 'user' as UserRole,
  status: null as ProfessionalStatus | null,
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: '1', email: 'ada@example.com', role: state.role } }),
}));

vi.mock('@/hooks/useProfessionals', () => ({
  useOwnApplication: () => ({ data: state.status ? { status: state.status } : null }),
}));

function draw(role: UserRole, status: ProfessionalStatus | null) {
  state.role = role;
  state.status = status;
  return render(
    <MemoryRouter>
      <ConsoleLinks onNavigate={() => {}} />
    </MemoryRouter>
  );
}

const CONSOLE = 'Professional console';

describe('the console entry in the settings tray', () => {
  beforeEach(() => {
    state.role = 'user';
    state.status = null;
  });

  it('offers nothing to somebody who has never applied', () => {
    draw('user', null);

    expect(screen.queryByText(CONSOLE)).toBeNull();
  });

  // The role only arrives on verification, so the application is what the entry follows
  it('opens while the application is still with a reviewer', () => {
    draw('user', 'pending');

    expect(screen.getByRole('link', { name: CONSOLE })).toHaveAttribute(
      'href',
      '/professionals/dashboard'
    );
  });

  it('opens for a booked interview, and for a verified vet', () => {
    draw('user', 'interview');
    expect(screen.getByRole('link', { name: CONSOLE })).toBeInTheDocument();

    draw('professional', 'verified');
    expect(screen.getAllByRole('link', { name: CONSOLE }).length).toBeGreaterThan(0);
  });

  it('takes the entry away once the application is refused', () => {
    draw('user', 'rejected');

    expect(screen.queryByText(CONSOLE)).toBeNull();
  });

  it('says so instead of linking while the listing is suspended', () => {
    draw('user', 'suspended');

    expect(screen.queryByText(CONSOLE)).toBeNull();
    expect(screen.getByText(/suspended/)).toBeInTheDocument();
  });

  it('still shows an admin their own console', () => {
    draw('admin', 'rejected');

    expect(screen.getByRole('link', { name: 'Admin console' })).toHaveAttribute('href', '/admin');
  });
});
