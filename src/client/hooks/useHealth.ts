import { getHealth, type Health } from '@/services/health.service';
import { useQuery } from '@tanstack/react-query';

/** Often enough that a dashboard left open notices, rarely enough to be free. */
const HEALTH_POLL_MS = 30_000;

/**
 * The health strip on the dashboard.
 *
 * Polled rather than read once: this is the one number on the page that answers
 * "is it broken right now", and a value from when the tab was opened cannot.
 */
export function useHealth() {
  return useQuery<Health>({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval: HEALTH_POLL_MS,
    staleTime: HEALTH_POLL_MS,
  });
}
