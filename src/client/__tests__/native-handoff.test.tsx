import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ConnectMealPlanner from '@/components/settings/consumer/ConnectMealPlanner';
import SettingsPage from '@/pages/settings/settings-page';

const state = vi.hoisted(() => ({
  user: { id: 'owner-a', name: 'Alex Owner', email: 'alex@example.com' },
  apiFetch: vi.fn(),
}));
vi.mock('@/components/providers/AuthProvider', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/services/api', () => ({ apiFetch: state.apiFetch }));
vi.mock('@/hooks/usePreferences', () => ({ usePreferences: () => ({}) }));

function handoff(code = 'a'.repeat(43)) {
  return {
    url: `vetify-planner://auth/callback?code=${code}`,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    user: { ...state.user },
  };
}
async function generate() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Generate/ }));
  });
}

describe('connect the computer account to the mobile planner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-08T10:00:00Z'));
    state.user = { id: 'owner-a', name: 'Alex Owner', email: 'alex@example.com' };
    state.apiFetch.mockReset().mockResolvedValue(handoff());
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('is reachable through the existing settings route and navigation', () => {
    render(
      <MemoryRouter initialEntries={['/settings/meal-planner']}>
        <Routes>
          <Route path="/settings/:section" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Connect meal planner' })).toBeDefined();
    expect(screen.getByRole('link', { name: /Connect meal planner/ }).getAttribute('href')).toBe(
      '/settings/meal-planner'
    );
    expect(screen.getByText('alex@example.com')).toBeDefined();
  });

  it('shows the account and installation instructions without another login', async () => {
    const { container } = render(<ConnectMealPlanner />);
    expect(screen.getByText('Alex Owner')).toBeDefined();
    expect(screen.getByText('alex@example.com')).toBeDefined();
    expect(screen.getByText(/Install the Vetify Meal Planner app/)).toBeDefined();
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(state.apiFetch).not.toHaveBeenCalled();
    await generate();
    expect(state.apiFetch).toHaveBeenCalledWith('/auth/native/handoff', {
      method: 'POST',
      body: { clientId: 'vetify-meal-planner', redirectUri: 'vetify-planner://auth/callback' },
    });
    const qr = screen.getByRole('img', { name: 'Connect your Vetify account to Meal Planner' });
    expect(qr.tagName.toLowerCase()).toBe('svg');
    expect(qr.querySelectorAll('path').length).toBeGreaterThan(0);
    expect(screen.getByText('Expires in 60 seconds.')).toBeDefined();
  });

  it('removes an expired QR and generates a fresh connection', async () => {
    render(<ConnectMealPlanner />);
    await generate();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/This QR has expired/)).toBeDefined();
    state.apiFetch.mockResolvedValue(handoff('b'.repeat(43)));
    await generate();
    expect(state.apiFetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('img')).toBeDefined();
    expect(screen.getByText('Expires in 60 seconds.')).toBeDefined();
  });

  it('hides the previous account QR immediately when the account changes', async () => {
    const page = render(<ConnectMealPlanner />);
    await generate();
    state.user = { id: 'owner-b', name: 'Second Owner', email: 'second@example.com' };
    page.rerender(<ConnectMealPlanner />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Second Owner')).toBeDefined();
  });

  it('ignores a pending connection response from the previous account', async () => {
    let complete!: (value: ReturnType<typeof handoff>) => void;
    state.apiFetch.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      })
    );
    const page = render(<ConnectMealPlanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate connection QR' }));
    const response = handoff();
    state.user = { id: 'owner-b', name: 'Second Owner', email: 'second@example.com' };
    page.rerender(<ConnectMealPlanner />);
    await act(async () => {
      complete(response);
    });
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('rejects a handoff for a different live browser account', async () => {
    state.apiFetch.mockResolvedValue({ ...handoff(), user: { ...state.user, id: 'owner-b' } });
    render(<ConnectMealPlanner />);
    await generate();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('Your account changed');
  });

  it('shows a retryable error and never renders arbitrary or credential-bearing URLs', async () => {
    state.apiFetch.mockResolvedValue({
      ...handoff(),
      url: 'https://untrusted.example/?token=secret',
    });
    render(<ConnectMealPlanner />);
    await generate();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('could not be created');
    state.apiFetch.mockRejectedValue(new Error('Sign in on this computer, then try again.'));
    await generate();
    expect(screen.getByRole('alert').textContent).toContain('Sign in on this computer');
  });
});
