import type { MutableRefObject } from 'react';
import type { CallState } from './call-types';
import { createPeer, type Signal, type IceServer } from './peer';

export function callPeerController(options: {
  peerRef: MutableRefObject<ReturnType<typeof createPeer> | null>;
  stream: MediaStream;
  closed: () => boolean;
  send: (signal: Signal) => void;
  setRemote: (stream: MediaStream | null) => void;
  setState: (state: CallState | ((state: CallState) => CallState)) => void;
}) {
  const pending: Signal[] = [];
  let config: { iceServers: IceServer[]; polite: boolean } | null = null;
  let peerArrived = false;
  const start = () => {
    if (options.closed() || options.peerRef.current || !config) return;
    options.peerRef.current = createPeer({
      ...config,
      stream: options.stream,
      sendSignal: options.send,
      onRemote: options.setRemote,
      onConnected: () => !options.closed() && options.setState('connected'),
      onClosed: () =>
        !options.closed() && options.setState((state) => (state === 'ended' ? state : 'ended')),
    });
    for (const signal of pending.splice(0)) void options.peerRef.current.handleSignal(signal);
  };
  return {
    start,
    configure: (value: { iceServers: IceServer[]; polite: boolean }) => {
      config = value;
    },
    peerHere: () => peerArrived,
    signal: ({ signal }: { signal: Signal }) => {
      if (options.closed()) return;
      if (options.peerRef.current) void options.peerRef.current.handleSignal(signal);
      else if (pending.length < 100) pending.push(signal);
    },
    peerJoined: () => {
      if (options.closed()) return;
      peerArrived = true;
      options.setState((state) => (state === 'connected' ? state : 'connecting'));
      start();
    },
    reset: () => {
      peerArrived = false;
      pending.splice(0);
      options.peerRef.current?.close();
      options.peerRef.current = null;
      options.setRemote(null);
      options.setState('connecting');
    },
  };
}
