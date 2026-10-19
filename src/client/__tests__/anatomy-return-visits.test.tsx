import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AnatomyEntry from '../pages/anatomy/anatomy-entry';
import { useAuth } from '../components/providers/AuthProvider';
import { refreshSession } from '../lib/auth';
import { ApiError } from '../services/api';
import { authorizeAnatomy } from '../pages/anatomy/anatomy-integration';

vi.mock('../components/providers/AuthProvider', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/auth', () => ({ refreshSession: vi.fn() }));
vi.mock('../pages/anatomy/anatomy-integration', async (original) => ({
  ...(await original<typeof import('../pages/anatomy/anatomy-integration')>()),
  authorizeAnatomy: vi.fn(),
}));
const session = {
  accessToken: 'synthetic-token',
  user: {
    id: 'owner',
    email: 'owner@example.test',
    name: 'Owner',
    emailVerified: true,
    role: 'user' as const,
    provider: 'local' as const,
    avatarUrl: null,
  },
};
const setSession = vi.fn();
let resolveRefresh: (value: typeof session) => void;
let rejectRefresh: (error: Error) => void;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_ANATOMY_ORIGIN', 'http://localhost:5176');
  vi.spyOn(window, 'parent', 'get').mockReturnValue({} as Window);
  vi.mocked(useAuth).mockReturnValue({
    ...session,
    isAuthenticated: true,
    status: 'loading',
    setSession,
    logout: vi.fn(),
  });
  vi.mocked(refreshSession).mockReturnValue(
    new Promise((resolve, reject) => {
      resolveRefresh = resolve;
      rejectRefresh = reject;
    })
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
function show() {
  return render(
    <MemoryRouter initialEntries={['/anatomy?hosted=1']}>
      <AnatomyEntry />
    </MemoryRouter>
  );
}

it('shows the viewer immediately from existing main session state while validation runs in the background', async () => {
  show();
  expect(screen.getByTitle('Vetify Anatomy viewer')).toBeInTheDocument();
  expect(screen.queryByText('Connecting to your Vetify session...')).not.toBeInTheDocument();
  expect(refreshSession).toHaveBeenCalledWith();
  expect(setSession).not.toHaveBeenCalled();
  await act(async () => resolveRefresh(session));
  expect(setSession).toHaveBeenCalledWith(session);
});
it('removes optimistic content when background validation rejects an expired session', async () => {
  show();
  await act(async () => rejectRefresh(new ApiError(401, 'Sign in again.')));
  await waitFor(() => expect(authorizeAnatomy).toHaveBeenCalledWith('http://localhost:5176', '/'));
  expect(screen.queryByTitle('Vetify Anatomy viewer')).not.toBeInTheDocument();
});
it('removes optimistic content on provider failure', async () => {
  show();
  await act(async () => rejectRefresh(new ApiError(503, 'Unavailable')));
  expect(await screen.findByRole('alert')).toHaveTextContent('sign-in is unavailable');
  expect(screen.queryByTitle('Vetify Anatomy viewer')).not.toBeInTheDocument();
});
it('removes optimistic content when the main provider observes logout', () => {
  const page = show();
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    status: 'anonymous',
    setSession,
    logout: vi.fn(),
  });
  page.rerender(
    <MemoryRouter initialEntries={['/anatomy?hosted=1']}>
      <AnatomyEntry />
    </MemoryRouter>
  );
  expect(screen.queryByTitle('Vetify Anatomy viewer')).not.toBeInTheDocument();
});
