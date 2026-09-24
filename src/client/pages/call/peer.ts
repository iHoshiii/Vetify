// A relayed bit of negotiation: either a session description or a single ICE candidate.
export type Signal = {
  description?: { type: RTCSdpType; sdp?: string };
  candidate?: RTCIceCandidateInit;
};

export type IceServer = { urls: string; username?: string; credential?: string };

type PeerOptions = {
  iceServers: IceServer[];
  // The owner is polite and yields on a collision; the vet is impolite and holds its offer.
  polite: boolean;
  stream: MediaStream;
  sendSignal: (signal: Signal) => void;
  onRemote: (stream: MediaStream) => void;
  onConnected: () => void;
  onClosed: () => void;
};

// A single RTCPeerConnection driven by the perfect-negotiation pattern, so either side may offer.
export function createPeer(opts: PeerOptions) {
  const pc = new RTCPeerConnection({ iceServers: opts.iceServers });
  let makingOffer = false;
  let ignoreOffer = false;

  for (const track of opts.stream.getTracks()) pc.addTrack(track, opts.stream);

  pc.ontrack = ({ streams }) => opts.onRemote(streams[0]);
  pc.onicecandidate = ({ candidate }) => {
    if (candidate) opts.sendSignal({ candidate: candidate.toJSON() });
  };
  pc.onnegotiationneeded = async () => {
    try {
      makingOffer = true;
      await pc.setLocalDescription();
      if (pc.localDescription) {
        opts.sendSignal({
          description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
        });
      }
    } catch {
      // A failed offer just leaves the connection where it was; the next event retries.
    } finally {
      makingOffer = false;
    }
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') opts.onConnected();
    // 'disconnected' often recovers on its own, so only a terminal state ends the call.
    if (['failed', 'closed'].includes(pc.connectionState)) opts.onClosed();
  };

  async function handleSignal(signal: Signal): Promise<void> {
    try {
      if (signal.description) {
        const collision =
          signal.description.type === 'offer' && (makingOffer || pc.signalingState !== 'stable');
        ignoreOffer = !opts.polite && collision;
        if (ignoreOffer) return;

        await pc.setRemoteDescription(signal.description as RTCSessionDescriptionInit);
        if (signal.description.type === 'offer') {
          await pc.setLocalDescription();
          if (pc.localDescription) {
            opts.sendSignal({
              description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
            });
          }
        }
      } else if (signal.candidate) {
        try {
          await pc.addIceCandidate(signal.candidate);
        } catch (err) {
          // A candidate arriving for an offer we chose to ignore is expected, not an error.
          if (!ignoreOffer) throw err;
        }
      }
    } catch {
      // Signalling races self-heal on the next event, so a single failed step is not fatal.
    }
  }

  return {
    handleSignal,
    close: () => {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onnegotiationneeded = null;
      pc.onconnectionstatechange = null;
      pc.close();
    },
  };
}
