const VISITED_KEY = 'vetify:call-visited';
const ACTIVE_KEY = 'vetify:call-active';
const ACTIVE_TTL_MS = 12_000;

// Per-browser call state, kept in localStorage so a booking row on another tab can read it. Per-browser on purpose: the shared joinedAt cannot say which of the two parties it was.
function readMap(key: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, number>): void {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // storage blocked, so the label just falls back to 'Join', which is not wrong
  }
}

// Which calls this browser has already entered, so a row can offer 'Rejoin' after the person leaves rather than 'Join'.
export function markCallVisited(appointmentId: string): void {
  const all = readMap(VISITED_KEY);
  all[appointmentId] = 1;
  writeMap(VISITED_KEY, all);
}

export function hasVisitedCall(appointmentId: string): boolean {
  return Boolean(readMap(VISITED_KEY)[appointmentId]);
}

// A tab in the room stamps this every few seconds, and the stamp going stale is how a crashed or closed tab stops counting as present.
export function beatCallActive(appointmentId: string): void {
  const all = readMap(ACTIVE_KEY);
  all[appointmentId] = Date.now();
  writeMap(ACTIVE_KEY, all);
}

export function endCallActive(appointmentId: string): void {
  const all = readMap(ACTIVE_KEY);
  delete all[appointmentId];
  writeMap(ACTIVE_KEY, all);
}

// True while a fresh heartbeat says some tab of this browser is sitting in the call right now.
export function isCallActive(appointmentId: string): boolean {
  const at = readMap(ACTIVE_KEY)[appointmentId];
  return typeof at === 'number' && Date.now() - at < ACTIVE_TTL_MS;
}
