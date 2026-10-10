import { act, cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionStatus from '@/components/settings/consumer/SubscriptionStatus';
import { apiFetch } from '@/services/api';

let userId = 'first-owner';
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: userId } }),
}));
vi.mock('@/services/api', () => ({ apiFetch: vi.fn() }));

const clients: QueryClient[] = [];
function accountView(client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })) {
  if (!clients.includes(client)) clients.push(client);
  return (
    <QueryClientProvider client={client}>
      <SubscriptionStatus />
    </QueryClientProvider>
  );
}
beforeEach(() => {
  userId = 'first-owner';
  vi.mocked(apiFetch).mockReset();
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
  vi.useRealTimers();
});

describe('shared account plan', () => {
  it('displays the current plan returned by the main account service', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      subscription: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    render(accountView());
    expect(await screen.findByText('Pro')).toBeDefined();
  });

  it('does not expose the previous account plan while the next account is loading', async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({
      subscription: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    const view = accountView();
    const rendered = render(view);
    await screen.findByText('Pro');
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => {}));
    userId = 'second-owner';
    rendered.rerender(accountView(clients[0]));
    expect(screen.queryByText('Pro')).toBeNull();
    expect(screen.getByText('Checking…')).toBeDefined();
  });

  it('removes an expired Pro label even when revalidation is still waiting', async () => {
    vi.useFakeTimers();
    vi.mocked(apiFetch).mockResolvedValueOnce({
      subscription: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      },
    });
    render(accountView());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByText('Pro')).toBeDefined();
    vi.mocked(apiFetch).mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.queryByText('Pro')).toBeNull();
    expect(screen.getByText('Checking…')).toBeDefined();
  });
});
