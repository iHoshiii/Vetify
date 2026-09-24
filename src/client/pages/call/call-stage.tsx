import ParticipantAvatar from '@/components/messaging/ParticipantAvatar';

import type { CallPeer, CallState } from './use-call';
import VideoTile from './video-tile';

type CallStageProps = {
  state: CallState;
  message: string | null;
  peer: CallPeer | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
};

// What to say over the video while the two sides are not yet talking.
const STATUS: Record<CallState, string | null> = {
  waiting: 'Waiting for the other person to join…',
  connecting: 'Connecting…',
  connected: null,
  ended: 'The call has ended.',
  error: null,
};

// The remote feed fills the stage, the local preview sits in the corner, and a banner covers the gaps.
export default function CallStage({
  state,
  message,
  peer,
  localStream,
  remoteStream,
}: CallStageProps) {
  const banner = message ?? STATUS[state];
  const peerName = peer?.name ?? 'Them';

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-900">
      <VideoTile stream={remoteStream} label={peerName} placeholder="" />

      {!remoteStream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {peer && <ParticipantAvatar name={peerName} avatarUrl={peer.avatarUrl} size="md" />}
          <p className="px-4 text-center text-sm text-slate-400">
            {peer ? peerName : 'No one else is here yet.'}
          </p>
        </div>
      )}

      <div className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-xl ring-2 ring-white/70 sm:h-40 sm:w-32">
        <VideoTile stream={localStream} muted mirror label="You" placeholder="Camera off" />
      </div>

      {banner && state !== 'connected' && (
        <div className="absolute inset-x-0 top-4 flex justify-center">
          <p className="rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
            {banner}
          </p>
        </div>
      )}
    </div>
  );
}
