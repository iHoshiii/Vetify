import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCall } from '../pages/call/use-call';

const fakes = vi.hoisted(() => {
  const listeners = new Map<string, Set<(data?: unknown) => void>>();
  const close = vi.fn();
  const stop = vi.fn();
  const socket = {
    on: vi.fn((name: string, listener: (data?: unknown) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(listener);
    }),
    off: vi.fn((name: string, listener: (data?: unknown) => void) =>
      listeners.get(name)?.delete(listener)
    ),
    emit: vi.fn((name: string, _payload: unknown, ack?: (data: unknown) => void) => {
      if (name === 'call:join')
        ack?.({
          ok: true,
          iceServers: [],
          polite: true,
          peerOnline: true,
          endsAt: new Date(Date.now() + 60_000).toISOString(),
          peer: { name: 'Vet', role: 'vet' },
        });
    }),
  };
  return {
    onConnected: null as (() => void) | null,
    listeners,
    close,
    stop,
    socket,
    user: { id: 'owner' },
    stream: {
      getAudioTracks: () => [],
      getVideoTracks: () => [],
      getTracks: () => [{ stop }],
    },
  };
});

vi.mock('../components/providers/AuthProvider', () => ({ useAuth: () => ({ user: fakes.user }) }));
vi.mock('../lib/socket', () => ({ getSocket: () => fakes.socket }));
vi.mock('../pages/call/use-media', () => ({
  useMedia: () => ({ stream: fakes.stream, error: null }),
}));
vi.mock('../pages/call/use-call-chat', () => ({
  useCallChat: () => ({ messages: [], sendChat: vi.fn() }),
}));
vi.mock('../pages/call/peer', () => ({
  createPeer: ({ onConnected }: { onConnected: () => void }) => {
    fakes.onConnected = onConnected;
    return { close: fakes.close, handleSignal: vi.fn() };
  },
}));

beforeEach(() => {
  fakes.listeners.clear();
  fakes.user = { id: 'owner' };
  fakes.onConnected = null;
  vi.clearAllMocks();
});

describe('call sign-in termination', () => {
  it('does not rejoin after an explicit hang-up followed by reconnect', async () => {
    const { result } = renderHook(() => useCall('appointment'));
    await waitFor(() => expect(fakes.onConnected).toBeTypeOf('function'));
    const joins = fakes.socket.emit.mock.calls.filter(([event]) => event === 'call:join').length;
    act(() => result.current.hangUp());
    act(() => fakes.listeners.get('disconnect')?.forEach((listener) => listener()));
    act(() => fakes.listeners.get('connect')?.forEach((listener) => listener()));
    expect(fakes.socket.emit.mock.calls.filter(([event]) => event === 'call:join')).toHaveLength(
      joins
    );
    expect(result.current.state).toBe('ended');
  });
  it('closes media peer when the server ends the participant sign-in', async () => {
    const { result } = renderHook(() => useCall('appointment'));
    await waitFor(() => expect(fakes.onConnected).toBeTypeOf('function'));
    act(() => fakes.onConnected?.());
    expect(result.current.state).toBe('connected');
    act(() =>
      fakes.listeners
        .get('session:ended')
        ?.forEach((listener) => listener({ reason: 'restricted' }))
    );
    expect(fakes.close).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('ended');
    expect(result.current.remoteStream).toBeNull();
  });
  it('closes the peer and releases the camera when the signed-in account changes', async () => {
    const { result, rerender } = renderHook(() => useCall('appointment'));
    await waitFor(() => expect(fakes.onConnected).toBeTypeOf('function'));
    act(() => fakes.onConnected?.());
    expect(result.current.state).toBe('connected');
    fakes.user = { id: 'other' };
    rerender();
    expect(fakes.close).toHaveBeenCalledOnce();
    expect(fakes.stop).toHaveBeenCalledOnce();
    expect(result.current.state).toBe('ended');
  });
});
