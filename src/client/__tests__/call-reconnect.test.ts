import { describe, expect, it, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import { reconnectCall } from '../pages/call/reconnect-call';

describe('call signalling reconnection', () => {
  it('rejoins after a dropped connection and removes listeners on unmount', () => {
    const listeners = new Map<string, () => void>();
    const socket = {
      on: (event: string, callback: () => void) => listeners.set(event, callback),
      off: (event: string) => listeners.delete(event),
    };
    const reset = vi.fn();
    const join = vi.fn();
    let closed = false;
    const stop = reconnectCall(socket as unknown as Socket, { closed: () => closed, reset, join });
    listeners.get('connect')?.();
    expect(join).not.toHaveBeenCalled();
    listeners.get('disconnect')?.();
    listeners.get('connect')?.();
    expect(reset).toHaveBeenCalledOnce();
    expect(join).toHaveBeenCalledOnce();
    closed = true;
    listeners.get('disconnect')?.();
    listeners.get('connect')?.();
    expect(join).toHaveBeenCalledOnce();
    stop();
    expect(listeners.size).toBe(0);
  });
});
