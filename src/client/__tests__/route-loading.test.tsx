import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Outlet, useOutletContext } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const state = vi.hoisted(() => {
  let finishAbout!: () => void;
  let finishDashboard!: () => void;
  return {
    auth: {
      isAuthenticated: true,
      status: 'authenticated',
      user: { role: 'user' as 'user' | 'admin' | 'professional' },
    },
    about: new Promise<void>((resolve) => {
      finishAbout = resolve;
    }),
    dashboard: new Promise<void>((resolve) => {
      finishDashboard = resolve;
    }),
    finishAbout: () => finishAbout(),
    finishDashboard: () => finishDashboard(),
    booksLoaded: vi.fn(),
    adminLoaded: vi.fn(),
    professionalLoaded: vi.fn(),
  };
});

vi.mock('../components/providers/AuthProvider', () => ({ useAuth: () => state.auth }));
vi.mock('../components/providers/RequireTermsAgreed', () => ({
  RequireTermsAgreed: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../components/navbar', () => ({ default: () => <header>Site navigation</header> }));
vi.mock('../components/RevealObserver', () => ({ default: () => null }));
vi.mock('../components/ScrollToTop', () => ({ default: () => null }));
vi.mock('../pages/home-page', () => ({ default: () => <h1>Home page</h1> }));
vi.mock('../pages/planner/planner-page', () => ({ default: () => <h1>Planner page</h1> }));
vi.mock('../pages/login/login-page', () => ({ default: () => <h1>Login page</h1> }));
vi.mock('../pages/about/about-page', async () => {
  await state.about;
  return { default: () => <h1>About page</h1> };
});
vi.mock('../pages/books/books-page', () => {
  state.booksLoaded();
  return { default: () => <h1>Books page</h1> };
});
vi.mock('../pages/admin/admin-layout', () => {
  state.adminLoaded();
  return {
    default: () => (
      <>
        <nav>Admin navigation</nav>
        <Outlet />
      </>
    ),
  };
});
vi.mock('../pages/admin/dashboard-page', async () => {
  await state.dashboard;
  return { default: () => <h1>Admin dashboard</h1> };
});
vi.mock('../pages/professionals/professional-layout', () => {
  state.professionalLoaded();
  return {
    default: () => (
      <>
        <nav>Professional navigation</nav>
        <Outlet context={{ application: 'Vet profile' }} />
      </>
    ),
  };
});
vi.mock('../pages/professionals/bookings-page', () => ({
  default: function BookingsPage({ kind }: { kind: string }) {
    const { application } = useOutletContext<{ application: string }>();
    return (
      <h1>
        {application}: {kind}
      </h1>
    );
  },
}));

beforeEach(() => {
  state.auth.isAuthenticated = true;
  state.auth.user.role = 'user';
  vi.clearAllMocks();
});

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('deferred routes', () => {
  it('renders home without importing private pages or console layouts', () => {
    renderRoute('/');
    expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible();
    expect(state.booksLoaded).not.toHaveBeenCalled();
    expect(state.adminLoaded).not.toHaveBeenCalled();
    expect(state.professionalLoaded).not.toHaveBeenCalled();
  });

  it('keeps site navigation visible while loading a page', async () => {
    renderRoute('/about');
    expect(screen.getByText('Site navigation')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Loading page...');
    await act(async () => state.finishAbout());
    expect(await screen.findByRole('heading', { name: 'About page' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('redirects an anonymous visitor without importing a protected page', async () => {
    state.auth.isAuthenticated = false;
    renderRoute('/books');
    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeVisible();
    expect(state.booksLoaded).not.toHaveBeenCalled();
  });

  it.each(['/admin', '/professionals/dashboard'])(
    'keeps the role gate before loading %s',
    (path) => {
      renderRoute(path);
      expect(screen.getByRole('heading', { name: 'Home page' })).toBeVisible();
      expect(state.adminLoaded).not.toHaveBeenCalled();
      expect(state.professionalLoaded).not.toHaveBeenCalled();
    }
  );

  it('keeps admin navigation visible while loading its dashboard', async () => {
    state.auth.user.role = 'admin';
    renderRoute('/admin');
    expect(await screen.findByText('Admin navigation')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Loading page...');
    await act(async () => state.finishDashboard());
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
  });

  it('preserves the professional layout context and default route', async () => {
    state.auth.user.role = 'professional';
    renderRoute('/professionals/dashboard');
    expect(await screen.findByRole('heading', { name: 'Vet profile: virtual' })).toBeVisible();
    expect(screen.getByText('Professional navigation')).toBeVisible();
  });

  it('continues to render the planner immediately for a signed-in user', () => {
    renderRoute('/planner');
    expect(screen.getByRole('heading', { name: 'Planner page' })).toBeVisible();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
