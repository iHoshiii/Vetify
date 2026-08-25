import { apiFetch } from './api';

/**
 * What the process says about itself.
 *
 * `db` comes from the driver's heartbeat rather than a connect flag, so a server
 * that has stopped answering reads as 'disconnected' and not as connected.
 */
export type Health = {
  status: string;
  db: 'uninitialized' | 'connected' | 'disconnected';
  /** Seconds since the process started. */
  uptime: number;
};

/** GET /api/v1/health. Public, and answers 200 even when Mongo is down. */
export function getHealth(signal?: AbortSignal): Promise<Health> {
  return apiFetch<Health>('/health', { signal });
}
