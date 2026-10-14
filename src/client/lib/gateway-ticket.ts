import { API_BASE_URL } from '@/services/api';

export class GatewayTicketError extends Error {
  constructor(readonly status: number) {
    super('Unable to open realtime connection');
  }
}
export async function fetchGatewayTicket(token: string, clientId: string, signal: AbortSignal) {
  const response = await fetch(`${API_BASE_URL}/account/realtime-ticket`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  });
  if (!response.ok) throw new GatewayTicketError(response.status);
  return ((await response.json()) as { ticket: string }).ticket;
}
export function gatewayAttempt(expired: () => void) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
    expired();
  }, 10_000);
  return {
    signal: controller.signal,
    finish: () => clearTimeout(timer),
    cancel: () => {
      clearTimeout(timer);
      controller.abort();
    },
  };
}
