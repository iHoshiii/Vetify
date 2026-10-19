import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SharedAuthPage from '../pages/auth-shared/auth-shared-page';
import { useAuth } from '../components/providers/AuthProvider';
import { refreshSession } from '../lib/auth';
import { apiFetch, ApiError } from '../services/api';

vi.mock('../components/providers/AuthProvider', () => ({ useAuth: vi.fn() }));
vi.mock('../lib/auth', () => ({ refreshSession: vi.fn() }));
vi.mock('../services/api', async (original) => ({
  ...(await original<typeof import('../services/api')>()),
  apiFetch: vi.fn(),
}));
const uid = 'synthetic-oidc-interaction-id';
const resume = `/auth/shared?interaction=${uid}`;
const user = {
  id: 'immutable-id',
  email: 'owner@example.com',
  name: 'Owner',
  role: 'user' as const,
  provider: 'local' as const,
  emailVerified: true,
  avatarUrl: null,
};
const setSession = vi.fn();
const logout = vi.fn();

function Destination() {
  const location = useLocation();
  return (
    <p>
      {location.pathname} return: {location.state?.from}
    </p>
  );
}
function show(path = resume) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/shared" element={<SharedAuthPage />} />
        <Route path="/login" element={<Destination />} />
        <Route path="/signup" element={<Destination />} />
      </Routes>
    </MemoryRouter>
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(HTMLFormElement.prototype, 'requestSubmit').mockImplementation(() => {});
  vi.mocked(useAuth).mockReturnValue({
    user,
    setSession,
    logout,
    accessToken: 'token',
    isAuthenticated: true,
    status: 'authenticated',
  });
  vi.mocked(refreshSession).mockResolvedValue({ user, accessToken: 'token' });
});

describe('shared Anatomy sign-in continuation', () => {
  it('restores a browser session and submits consent only to its fixed main interaction', async () => {
    show();
    const button = await screen.findByRole('button', { name: 'Continue' });
    expect(refreshSession).toHaveBeenCalledWith({ fresh: true });
    expect(setSession).toHaveBeenCalledWith({ user, accessToken: 'token' });
    expect(button.closest('form')).toHaveAttribute(
      'action',
      `/api/oidc/interaction/${uid}/complete`
    );
    expect(button.closest('form')).toHaveAttribute('method', 'post');
    expect(screen.getByText(/owner@example.com/)).toBeInTheDocument();
    await waitFor(() =>
      expect(HTMLFormElement.prototype.requestSubmit).toHaveBeenCalledWith(button)
    );
  });

  it('preserves the interaction when an anonymous user needs existing login', async () => {
    vi.mocked(refreshSession).mockRejectedValue(new ApiError(401, 'Please sign in.'));
    show();
    expect(await screen.findByText(`/login return: ${resume}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('preserves the interaction while requiring email verification through existing signup', async () => {
    vi.mocked(refreshSession).mockResolvedValue({
      accessToken: 'token',
      user: { ...user, emailVerified: false },
    });
    show();
    expect(await screen.findByText(`/signup return: ${resume}`)).toBeInTheDocument();
  });

  it('shows an account restriction without offering consent', async () => {
    vi.mocked(refreshSession).mockRejectedValue(new ApiError(403, 'This account is banned.'));
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent('This account is banned.');
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });

  it('rejects malformed interactions without reading a session or creating a form', () => {
    show('/auth/shared?interaction=https://attacker.example/');
    expect(screen.getByRole('alert')).toHaveTextContent('This sign-in link is invalid.');
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('offers an explicit global logout and clears main UI authentication after success', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ loggedOut: true, scope: 'all' });
    logout.mockResolvedValue(undefined);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out of Vetify everywhere' }));
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/auth/logout-all', { method: 'POST' })
    );
    expect(await screen.findByText(`/login return: ${resume}`)).toBeInTheDocument();
    expect(logout).toHaveBeenCalledOnce();
  });
});
