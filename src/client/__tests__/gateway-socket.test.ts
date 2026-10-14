import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GatewaySocket } from '../lib/gateway-socket';
import {
  FakeWebSocket,
  setupBrowserGateway,
  openGateway,
  token,
  fetchTicket,
} from './gateway-fixtures';

let socket: GatewaySocket | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  setupBrowserGateway();
});
afterEach(() => {
  socket?.disconnect();
  socket = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('API Gateway browser connection', () => {
  it('uses an opaque ticket in the URL and waits for ready before connecting', async () => {
    const credential = token();
    socket = new GatewaySocket('wss://gateway.test/prod', credential);
    const connected = vi.fn();
    socket.on('connect', connected).connect();
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const ws = FakeWebSocket.instances[0];
    expect(ws.url).toContain('ticket=opaque-ticket');
    expect(ws.url).not.toContain(credential);
    expect(socket.connected).toBe(false);
    ws.ready();
    expect(socket.connected).toBe(true);
    expect(connected).toHaveBeenCalledOnce();
    expect(fetchTicket.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: `Bearer ${credential}` },
    });
  });
  it('correlates acknowledgements and times out missing replies', async () => {
    const opened = await openGateway();
    socket = opened.socket;
    const acknowledged = vi.fn();
    socket.timeout(500).emit('thread:typing', { threadId: 'one' }, acknowledged);
    const request = opened.ws.sent.at(-1)!;
    opened.ws.receive({ requestId: request.requestId, payload: { delivered: true } });
    expect(acknowledged).toHaveBeenCalledWith(null, { delivered: true });
    socket.timeout(500).emit('thread:typing', {}, acknowledged);
    await vi.advanceTimersByTimeAsync(501);
    expect(acknowledged).toHaveBeenLastCalledWith(expect.any(Error));
  });
  it('reconnects with a new ticket and sends heartbeats', async () => {
    const opened = await openGateway();
    socket = opened.socket;
    const disconnected = vi.fn();
    socket.on('disconnect', disconnected);
    await vi.advanceTimersByTimeAsync(25_000);
    expect(opened.ws.sent.some((value) => value.event === 'connection:heartbeat')).toBe(true);
    opened.ws.close();
    expect(disconnected).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1500);
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(fetchTicket).toHaveBeenCalledTimes(2);
    FakeWebSocket.instances[1].ready();
    expect(socket.connected).toBe(true);
  });
  it('queues the first call join but does not replay stale ICE signals', async () => {
    socket = new GatewaySocket('wss://gateway.test/prod', token()).connect();
    socket.emit('call:join', { appointmentId: 'booking' });
    socket.emit('call:signal', { signal: 'old' });
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    FakeWebSocket.instances[0].ready();
    expect(
      FakeWebSocket.instances[0].sent.filter((value) => value.event === 'call:join')
    ).toHaveLength(1);
    expect(
      FakeWebSocket.instances[0].sent.filter((value) => value.event === 'call:signal')
    ).toHaveLength(0);
  });
  it('does not reconnect after logout or an obsolete ticket response', async () => {
    let finish!: (response: Response) => void;
    fetchTicket.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    socket = new GatewaySocket('wss://gateway.test/prod', token()).connect();
    socket.disconnect();
    finish(new Response(JSON.stringify({ ticket: 'old' })));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });
  it('cancels a queued call join when the caller leaves before connection readiness', async () => {
    socket = new GatewaySocket('wss://gateway.test/prod', token()).connect();
    socket.emit('call:join', { appointmentId: 'booking' });
    socket.emit('call:leave', { appointmentId: 'booking' });
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    FakeWebSocket.instances[0].ready();
    expect(
      FakeWebSocket.instances[0].sent.filter((value) => value.event === 'call:join')
    ).toHaveLength(0);
  });
});
