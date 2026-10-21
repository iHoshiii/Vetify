import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnatomyEntry from '../pages/anatomy/anatomy-entry';
import { useAuth } from '../components/providers/AuthProvider';
import { refreshSession } from '../lib/auth';
import { ApiError } from '../services/api';
import { authorizeAnatomy, visitAnatomy } from '../pages/anatomy/anatomy-integration';

vi.mock('../components/providers/AuthProvider', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/auth', () => ({ refreshSession: vi.fn() }));
vi.mock('../pages/anatomy/anatomy-integration', async (original) => ({
  ...(await original<typeof import('../pages/anatomy/anatomy-integration')>()),
  authorizeAnatomy: vi.fn(),
  visitAnatomy: vi.fn(),
}));
const user = {
  id: 'owner',
  email: 'owner@example.test',
  name: 'Owner',
  role: 'user' as const,
  provider: 'local' as const,
  emailVerified: true,
  avatarUrl: null,
};
const session = { user, accessToken: 'synthetic-token' };
const setSession = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_ANATOMY_ORIGIN', 'http://localhost:5176');
  vi.mocked(useAuth).mockReturnValue({
    ...session,
    setSession,
    logout: vi.fn(),
    isAuthenticated: true,
    status: 'authenticated',
  });
  vi.mocked(refreshSession).mockResolvedValue(session);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
function show(path = '/anatomy') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/anatomy" element={<AnatomyEntry />} />
        <Route path="/login" element={<p>Main login</p>} />
      </Routes>
    </MemoryRouter>
  );
}
function hosted() {
  vi.spyOn(window, 'parent', 'get').mockReturnValue({} as Window);
}

describe('canonical Anatomy domain', () => {
  it('sends a signed-in main visitor directly to Anatomy with the selected view', async () => {
    show('/anatomy?view=%2Fbird%2Fnervous');
    await waitFor(() =>
      expect(visitAnatomy).toHaveBeenCalledWith('http://localhost:5176', '/bird/nervous')
    );
    expect(refreshSession).not.toHaveBeenCalled();
  });
  it('checks the browser cookie before requiring main login for a signed-out visitor', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      accessToken: null,
      setSession,
      logout: vi.fn(),
      isAuthenticated: false,
      status: 'anonymous',
    });
    vi.mocked(refreshSession).mockRejectedValue(new ApiError(401, 'Please sign in.'));
    show();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('Main login')).not.toBeInTheDocument();
    expect(await screen.findByText('Main login')).toBeInTheDocument();
    expect(visitAnatomy).not.toHaveBeenCalled();
  });
  it('shows only a loading indicator while restoring a hosted session', () => {
    hosted();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      accessToken: null,
      setSession,
      logout: vi.fn(),
      isAuthenticated: false,
      status: 'anonymous',
    });
    vi.mocked(refreshSession).mockReturnValue(new Promise(() => {}));
    show('/anatomy?hosted=1');
    expect(screen.getByRole('status', { name: 'Loading' }).textContent).toBe('');
    expect(screen.queryByText(/connecting|account|opening/i)).not.toBeInTheDocument();
  });
  it('does not activate hosted mode at the top level', () => {
    show('/anatomy?hosted=1');
    expect(visitAnatomy).toHaveBeenCalledWith('http://localhost:5176', '/');
  });
  it('restores main authentication for the hosted navbar before opening the nested viewer', async () => {
    hosted();
    show('/anatomy?hosted=1');
    expect(await screen.findByTitle('Vetify Anatomy viewer')).toHaveAttribute(
      'src',
      'http://localhost:5176/?embed=1'
    );
    expect(refreshSession).toHaveBeenCalledWith();
    await waitFor(() => expect(setSession).toHaveBeenCalledWith(session));
    expect(visitAnatomy).not.toHaveBeenCalled();
  });
  it('asks the Anatomy host to start top-level main sign-in when the main cookie has expired', async () => {
    hosted();
    vi.mocked(refreshSession).mockRejectedValue(new ApiError(401, 'Please sign in.'));
    show('/anatomy?hosted=1');
    await waitFor(() =>
      expect(authorizeAnatomy).toHaveBeenCalledWith('http://localhost:5176', '/')
    );
    expect(screen.queryByTitle('Vetify Anatomy viewer')).not.toBeInTheDocument();
  });
  it('keeps provider outages visible without repeatedly starting sign-in', async () => {
    hosted();
    vi.mocked(refreshSession).mockRejectedValue(new ApiError(503, 'Unavailable'));
    show('/anatomy?hosted=1');
    expect(await screen.findByRole('alert')).toHaveTextContent('sign-in is unavailable');
    expect(authorizeAnatomy).not.toHaveBeenCalled();
  });
});
