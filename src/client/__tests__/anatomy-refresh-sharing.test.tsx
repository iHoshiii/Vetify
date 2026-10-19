import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../components/providers/AuthProvider';
import AnatomyEntry from '../pages/anatomy/anatomy-entry';
import { writeAuthState } from '../lib/auth';

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
function Navigation() {
  const [open, setOpen] = useState(false);
  const { status } = useAuth();
  return (
    <>
      <button onClick={() => setOpen(true)}>Open Anatomy</button>
      <p>{status}</p>
      {open && <AnatomyEntry />}
    </>
  );
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
  sessionStorage.clear();
});

it('joins the provider refresh already running when the Anatomy route mounts', async () => {
  localStorage.clear();
  sessionStorage.clear();
  writeAuthState(session);
  vi.stubEnv('VITE_ANATOMY_ORIGIN', 'http://localhost:5176');
  vi.spyOn(window, 'parent', 'get').mockReturnValue({ postMessage: vi.fn() } as unknown as Window);
  let complete!: (value: Response) => void;
  const request = new Promise<Response>((resolve) => {
    complete = resolve;
  });
  const fetch = vi.fn(() => request);
  vi.stubGlobal('fetch', fetch);
  render(
    <MemoryRouter initialEntries={['/anatomy?hosted=1']}>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(fetch).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Open Anatomy' }));
  expect(screen.getByTitle('Vetify Anatomy viewer')).toBeInTheDocument();
  expect(screen.queryByText('Connecting to your Vetify session...')).not.toBeInTheDocument();
  await act(async () => complete(new Response(JSON.stringify(session), { status: 200 })));
  await waitFor(() => expect(screen.getByText('authenticated')).toBeInTheDocument());
  expect(fetch).toHaveBeenCalledOnce();
});
