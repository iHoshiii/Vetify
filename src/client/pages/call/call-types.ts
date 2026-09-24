import type { IceServer } from './peer';

export type CallState = 'waiting' | 'connecting' | 'connected' | 'ended' | 'error';

export type CallPeer = { name: string | null; avatarUrl: string | null; role: 'vet' | 'owner' };

// The server's reply to call:join: connection config plus who is on the other side.
export type JoinAck =
  | {
      ok: true;
      iceServers: IceServer[];
      peerOnline: boolean;
      polite: boolean;
      endsAt: string;
      peer: CallPeer;
    }
  | { ok: false; error: string };
