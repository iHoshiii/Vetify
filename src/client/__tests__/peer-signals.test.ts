import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPeer } from '../pages/call/peer';

class FakePeer {
  static latest: FakePeer;
  signalingState = 'stable';
  connectionState = 'new';
  remoteDescription: RTCSessionDescriptionInit | null = null;
  localDescription = { type: 'answer', sdp: 'answer' };
  ontrack = null;
  onicecandidate = null;
  onconnectionstatechange = null;
  onnegotiationneeded: (() => Promise<void>) | null = null;
  addTrack = vi.fn();
  close = vi.fn();
  addIceCandidate = vi.fn(async () => {
    if (!this.remoteDescription) throw new Error('No remote description');
  });
  setLocalDescription = vi.fn(async () => undefined);
  setRemoteDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    this.remoteDescription = description;
  });
  constructor() {
    FakePeer.latest = this;
  }
}
let peer: ReturnType<typeof createPeer>;
beforeEach(() => {
  vi.stubGlobal('RTCPeerConnection', FakePeer);
  peer = createPeer({
    stream: { getTracks: () => [] } as unknown as MediaStream,
    iceServers: [],
    polite: true,
    sendSignal: vi.fn(),
    onRemote: vi.fn(),
    onConnected: vi.fn(),
    onClosed: vi.fn(),
  });
});
afterEach(() => {
  peer.close();
  vi.unstubAllGlobals();
});

it('holds early ICE candidates until the remote description has been applied', async () => {
  const candidate = { candidate: 'early-candidate' };
  await peer.handleSignal({ candidate });
  expect(FakePeer.latest.addIceCandidate).not.toHaveBeenCalled();
  await peer.handleSignal({ description: { type: 'offer', sdp: 'offer' } });
  expect(FakePeer.latest.addIceCandidate).toHaveBeenCalledWith(candidate);
});

it('serializes overlapping descriptions before applying subsequent candidates', async () => {
  let release!: () => void;
  FakePeer.latest.setRemoteDescription.mockImplementationOnce(async (description) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    FakePeer.latest.remoteDescription = description;
  });
  const description = peer.handleSignal({ description: { type: 'offer', sdp: 'offer' } });
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  const candidate = peer.handleSignal({ candidate: { candidate: 'during-description' } });
  await Promise.resolve();
  expect(FakePeer.latest.addIceCandidate).not.toHaveBeenCalled();
  release();
  await Promise.all([description, candidate]);
  expect(FakePeer.latest.addIceCandidate).toHaveBeenCalledOnce();
});

it('does not process buffered signals after the call is closed', async () => {
  await peer.handleSignal({ candidate: { candidate: 'early' } });
  peer.close();
  await peer.handleSignal({ description: { type: 'offer', sdp: 'late' } });
  expect(FakePeer.latest.setRemoteDescription).not.toHaveBeenCalled();
});
