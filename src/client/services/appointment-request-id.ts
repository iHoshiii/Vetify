import type { AppointmentRequestInput } from '@shared/schemas';
import { readAuthState } from '@/lib/auth-storage';

const pending = new Map<string, string>();
const preparing = new Map<string, Promise<string>>();
const storageKey = 'vetify.booking-requests';

function loadRequests(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function saveRequests(entries: Record<string, string>): void {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(entries));
  } catch {
    return;
  }
}

function keyFor(input: AppointmentRequestInput): string {
  return JSON.stringify([readAuthState()?.user?.id ?? '', input]);
}

export async function appointmentRequestId(input: AppointmentRequestInput): Promise<string> {
  const key = keyFor(input);
  const existing = pending.get(key);
  if (existing) return existing;
  const inFlight = preparing.get(key);
  if (inFlight) return inFlight;
  const prepare = (async () => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, '0')
    ).join('');
    const entries = loadRequests();
    const stored = entries[hash];
    const requestId =
      typeof stored === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)
        ? stored
        : crypto.randomUUID();
    pending.set(key, requestId);
    entries[hash] = requestId;
    saveRequests(entries);
    return requestId;
  })();
  preparing.set(key, prepare);
  try {
    return await prepare;
  } finally {
    preparing.delete(key);
  }
}

export function finishAppointmentRequest(input: AppointmentRequestInput, requestId: string): void {
  const key = keyFor(input);
  if (pending.get(key) !== requestId) return;
  pending.delete(key);
  const entries = loadRequests();
  for (const [hash, value] of Object.entries(entries)) {
    if (value === requestId) delete entries[hash];
  }
  saveRequests(entries);
}
