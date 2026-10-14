import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';

const fakes = vi.hoisted(() => ({
  cancel: null as ((error: Error) => void) | null,
  socket: { connected: true, auth: {}, disconnect: vi.fn(), connect: vi.fn(), timeout: vi.fn() },
}));
vi.mock('socket.io-client', () => ({ io: () => fakes.socket }));
beforeEach(() => {
  vi.stubEnv('VITE_REALTIME_URL', '');
  fakes.cancel = null;
  vi.clearAllMocks();
  fakes.socket.timeout.mockReturnValue({
    emit: (_event: string, _payload: unknown, callback: (error: Error) => void) => {
      fakes.cancel = callback;
    },
  });
  fakes.socket.disconnect.mockImplementation(() => fakes.cancel?.(new Error('Disconnected')));
});
afterEach(() => {
  disconnectSocket();
  vi.unstubAllEnvs();
});

it('does not reopen a socket when logout cancels a pending login-token renewal', () => {
  const token = (nonce: number) =>
    `header.${btoa(JSON.stringify({ sub: 'owner', nonce }))}.signature`;
  connectSocket(token(1));
  connectSocket(token(2));
  expect(fakes.cancel).toBeTypeOf('function');
  disconnectSocket();
  expect(fakes.socket.disconnect).toHaveBeenCalledOnce();
  expect(fakes.socket.connect).not.toHaveBeenCalled();
  expect(getSocket()).toBeNull();
});
