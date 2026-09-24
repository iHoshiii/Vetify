import { env } from '../config/env';

// What a browser's RTCPeerConnection accepts, narrowed to the fields we set.
export type IceServer = { urls: string; username?: string; credential?: string };

// Built server-side so the browser never holds TURN credentials in its bundle.
// Google STUN is always offered; the TURN relay is added only when configured.
export function iceServers(): IceServer[] {
  const servers: IceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (env.TURN_URL) {
    servers.push({
      urls: env.TURN_URL,
      username: env.TURN_USERNAME,
      credential: env.TURN_CREDENTIAL,
    });
  }
  return servers;
}
