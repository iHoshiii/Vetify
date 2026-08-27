import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChatWindow from '../components/chat-ui/chat-windows';
import { AuthProvider } from '../components/providers/AuthProvider';
import { RequireAuth } from '../components/providers/RequireAuth';
import { FREE_ANON_QUERIES, recordAnonQuery } from '../lib/chat-quota';

vi.mock('../services/chat.service', () => ({
  sendMessage: vi.fn().mockResolvedValue({ reply: 'Hello!' }),
}));

vi.mock('../lib/auth', () => ({
  readAuthState: vi.fn().mockReturnValue(null),
  writeAuthState: vi.fn(),
  refreshSession: vi.fn().mockResolvedValue(null),
  logoutFromServer: vi.fn().mockResolvedValue(undefined),
}));

const SESSION = {
  accessToken: 'token',
  user: {
    id: '1',
    email: 'ada@example.com',
    name: 'Ada',
    provider: 'local' as const,
    avatarUrl: null,
    emailVerified: true,
    role: 'user' as const,
  },
};

beforeEach(async () => {
  window.localStorage.clear();
  const { readAuthState, refreshSession } = await import('../lib/auth');
  vi.mocked(readAuthState).mockReturnValue(null);
  vi.mocked(refreshSession).mockResolvedValue(SESSION);
});

function renderGated(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route
            path={path}
            element={
              <RequireAuth>
                <div>gated content</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('RequireAuth', () => {
  it.each(['/book-appointment', '/map', '/planner', '/anatomy', '/professionals/apply'])(
    'sends an anonymous visitor from %s to the login page',
    (path) => {
      renderGated(path);

      expect(screen.getByText('login page')).toBeDefined();
      expect(screen.queryByText('gated content')).toBeNull();
    }
  );

  it('lets a signed-in visitor straight through', async () => {
    const { readAuthState } = await import('../lib/auth');
    vi.mocked(readAuthState).mockReturnValue(SESSION);

    renderGated('/planner');

    expect(screen.getByText('gated content')).toBeDefined();
    expect(screen.queryByText('login page')).toBeNull();
  });
});

function renderChat() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ChatWindow messages={[]} onMessagesChange={vi.fn()} />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('anonymous chat allowance', () => {
  it('offers the full allowance to a fresh visitor', () => {
    renderChat();

    expect(screen.getByText(new RegExp(`${FREE_ANON_QUERIES} free questions left`))).toBeDefined();
    expect(screen.getByPlaceholderText(/ask about your pet/i)).toBeDefined();
  });

  it('counts down and switches to the singular on the last one', () => {
    for (let i = 0; i < FREE_ANON_QUERIES - 1; i++) recordAnonQuery();
    renderChat();

    expect(screen.getByText(/1 free question left/)).toBeDefined();
    expect(screen.getByPlaceholderText(/ask about your pet/i)).toBeDefined();
  });

  it('replaces the composer with a login prompt once the allowance is spent', () => {
    for (let i = 0; i < FREE_ANON_QUERIES; i++) recordAnonQuery();
    renderChat();

    expect(screen.queryByPlaceholderText(/ask about your pet/i)).toBeNull();
    expect(
      screen.getByText(new RegExp(`used your ${FREE_ANON_QUERIES} free questions`, 'i'))
    ).toBeDefined();
    expect(screen.getByText('Log in')).toBeDefined();
  });

  it('ignores the allowance entirely for a signed-in user', async () => {
    for (let i = 0; i < FREE_ANON_QUERIES + 3; i++) recordAnonQuery();
    const { readAuthState } = await import('../lib/auth');
    vi.mocked(readAuthState).mockReturnValue(SESSION);

    renderChat();

    expect(screen.getByPlaceholderText(/ask about your pet/i)).toBeDefined();
    expect(screen.queryByText(/free questions left/)).toBeNull();
    expect(screen.queryByText(/used your/i)).toBeNull();
  });
});
