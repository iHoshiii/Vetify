import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';

type CallControlsProps = {
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onHangUp: () => void;
};

// The mic/cam/hang-up row pinned under the video stage.
export default function CallControls({
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onHangUp,
}: CallControlsProps) {
  // A toggle that is off reads as a muted/stopped state, so it turns red to say so.
  const toggle = (active: boolean) =>
    `flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors ${
      active ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-400'
    }`;

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={onToggleMic}
        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
        className={toggle(micOn)}
      >
        {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={onToggleCam}
        aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
        className={toggle(camOn)}
      >
        {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={onHangUp}
        aria-label="Leave call"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  );
}
