import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../components/providers/AuthProvider';
import AnatomyEntry from '../pages/anatomy/anatomy-entry';
import { writeAuthState } from '../lib/auth';
import { visitAnatomy } from '../pages/anatomy/anatomy-integration';

vi.mock('../pages/anatomy/anatomy-integration', async (original) => ({
  ...(await original<typeof import('../pages/anatomy/anatomy-integration')>()),
  visitAnatomy: vi.fn(),
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
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  localStorage.clear();
  sessionStorage.clear();
});

it('finishes startup refresh before navigating away with a stored session', async () => {
  localStorage.clear();
  sessionStorage.clear();
  writeAuthState(session);
  vi.stubEnv('VITE_ANATOMY_ORIGIN', 'http://localhost:5176');
  let complete!: (value: Response) => void;
  const fetch = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      })
  );
  vi.stubGlobal('fetch', fetch);
  render(
    <MemoryRouter initialEntries={['/anatomy']}>
      <AuthProvider>
        <AnatomyEntry />
      </AuthProvider>
    </MemoryRouter>
  );
  expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  expect(visitAnatomy).not.toHaveBeenCalled();
  await act(async () => complete(Response.json(session)));
  await waitFor(() => expect(visitAnatomy).toHaveBeenCalledWith('http://localhost:5176', '/'));
  expect(fetch).toHaveBeenCalledOnce();
});

it('restores a valid cookie without stored account state before launching Anatomy', async () => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubEnv('VITE_ANATOMY_ORIGIN', 'http://localhost:5176');
  let complete!: (value: Response) => void;
  const fetch = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        complete = resolve;
      })
  );
  vi.stubGlobal('fetch', fetch);
  render(
    <MemoryRouter initialEntries={['/anatomy?view=%2Fcat%2Fdigestive']}>
      <AuthProvider>
        <Routes>
          <Route path="/anatomy" element={<AnatomyEntry />} />
          <Route path="/login" element={<p>Main login</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
  expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  expect(screen.queryByText('Main login')).not.toBeInTheDocument();
  await act(async () => complete(Response.json(session)));
  await waitFor(() =>
    expect(visitAnatomy).toHaveBeenCalledWith('http://localhost:5176', '/cat/digestive')
  );
  expect(fetch).toHaveBeenCalledOnce();
  expect(screen.queryByText('Main login')).not.toBeInTheDocument();
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
