import type { AccountSubscription } from '@shared/subscriptions';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';
import { apiFetch } from '@/services/api';

const VALIDITY_MS = 30_000;

export function useSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['subscription', user?.id ?? 'anonymous'],
    enabled: Boolean(user),
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      const timeout = setTimeout(abort, 15_000);
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
      try {
        const { subscription } = await apiFetch<{ subscription: AccountSubscription }>(
          '/auth/subscription',
          { signal: controller.signal }
        );
        return subscription;
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
      }
    },
    staleTime: (query) => {
      const value = query.state.data;
      if (value?.plan !== 'pro') return VALIDITY_MS;
      const remaining = value.expiresAt
        ? Date.parse(value.expiresAt) - query.state.dataUpdatedAt
        : 0;
      return Number.isFinite(remaining) ? Math.max(0, Math.min(VALIDITY_MS, remaining)) : 0;
    },
    retry: 1,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const value = query.state.data;
      const expiry =
        value?.plan === 'pro' && value.expiresAt ? Date.parse(value.expiresAt) : Infinity;
      const remaining = Math.min(query.state.dataUpdatedAt + VALIDITY_MS, expiry) - Date.now();
      return remaining > 0 ? Math.max(50, Math.min(VALIDITY_MS, remaining)) : 5000;
    },
  });
}
