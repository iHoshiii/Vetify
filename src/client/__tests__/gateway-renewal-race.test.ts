import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GatewaySocket } from '../lib/gateway-socket';
import {
  FakeWebSocket,
  setupBrowserGateway,
  openGateway,
  fetchTicket,
  token,
} from './gateway-fixtures';

let socket: GatewaySocket;
beforeEach(() => {
  vi.useFakeTimers();
  setupBrowserGateway();
});

it('retries a hung ticket and ignores its late response after a replacement connects', async () => {
  let finish!: (response: Response) => void;
  fetchTicket.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  socket = new GatewaySocket('wss://gateway.test/prod', token()).connect();
  await vi.advanceTimersByTimeAsync(11_500);
  expect(fetchTicket).toHaveBeenCalledTimes(2);
  FakeWebSocket.instances[0].ready();
  finish(new Response(JSON.stringify({ ticket: 'obsolete' })));
  await vi.advanceTimersByTimeAsync(0);
  expect(FakeWebSocket.instances).toHaveLength(1);
  expect(socket.connected).toBe(true);
});

it('retries a WebSocket that never completes its opening handshake', async () => {
  socket = new GatewaySocket('wss://gateway.test/prod', token()).connect();
  await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
  await vi.advanceTimersByTimeAsync(11_500);
  expect(fetchTicket).toHaveBeenCalledTimes(2);
  expect(FakeWebSocket.instances).toHaveLength(2);
  FakeWebSocket.instances[1].ready();
  expect(socket.connected).toBe(true);
});
afterEach(() => {
  socket?.disconnect();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('starts only one replacement when a disconnect cancels a pending session renewal', async () => {
  const opened = await openGateway();
  socket = opened.socket;
  socket.timeout(5000).emit('session:renew', {}, (error) => {
    if (error) socket.disconnect().connect();
  });
  opened.ws.close();
  await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
  FakeWebSocket.instances[1].ready();
  await vi.advanceTimersByTimeAsync(1500);
  expect(fetchTicket).toHaveBeenCalledTimes(2);
  expect(FakeWebSocket.instances).toHaveLength(2);
  expect(socket.connected).toBe(true);
});
