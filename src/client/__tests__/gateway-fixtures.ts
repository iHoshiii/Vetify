import { vi } from 'vitest';
import { GatewaySocket } from '../lib/gateway-socket';

export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen?: () => void;
  onclose?: () => void;
  onerror?: () => void;
  onmessage?: (event: { data: string }) => void;
  sent: { event: string; payload: unknown; requestId?: string }[] = [];
  url: string;
  constructor(url: string | URL) {
    this.url = String(url);
    FakeWebSocket.instances.push(this);
  }
  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }
  close(): void {
    this.onclose?.();
  }
  receive(value: unknown): void {
    this.onmessage?.({ data: JSON.stringify(value) });
  }
  ready(): void {
    this.onopen?.();
    const ready = this.sent.find((value) => value.event === 'connection:ready')!;
    this.receive({ requestId: ready.requestId, payload: { ok: true } });
  }
}
export const token = () =>
  `header.${btoa(
    JSON.stringify({ sub: 'owner', exp: Math.floor(Date.now() / 1000) + 600 })
  )}.signature`;
export const fetchTicket = vi.fn(
  async (_url: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify({ ticket: 'opaque-ticket' }), { status: 200 })
);
export function setupBrowserGateway(): void {
  FakeWebSocket.instances = [];
  fetchTicket.mockClear();
  fetchTicket.mockImplementation(
    async () => new Response(JSON.stringify({ ticket: 'opaque-ticket' }), { status: 200 })
  );
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('fetch', fetchTicket);
  vi.stubGlobal('crypto', { randomUUID: () => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' });
}
export async function openGateway(): Promise<{ socket: GatewaySocket; ws: FakeWebSocket }> {
  const socket = new GatewaySocket('wss://gateway.test/prod', token()).connect();
  await vi.waitFor(() => {
    if (!FakeWebSocket.instances.length) throw Error('waiting');
  });
  const ws = FakeWebSocket.instances.at(-1)!;
  ws.ready();
  return { socket, ws };
}
