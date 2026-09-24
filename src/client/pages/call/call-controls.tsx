import { Mic, MessageCircle, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';

type CallControlsProps = {
  micOn: boolean;
  camOn: boolean;
  chatOpen: boolean;
  chatUnread: number;
  onToggleChat: () => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onHangUp: () => void;
};

// The chat/mic/cam/hang-up row pinned under the video stage.
export default function CallControls({
  micOn,
  camOn,
  chatOpen,
  chatUnread,
  onToggleChat,
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
        onClick={onToggleChat}
        aria-label={chatOpen ? 'Close chat' : 'Open chat'}
        className={`relative flex h-12 w-12 items-center justify-center rounded-full text-white transition-colors ${
          chatOpen ? 'bg-teal-600 hover:bg-teal-500' : 'bg-slate-700 hover:bg-slate-600'
        }`}
      >
        <MessageCircle className="h-5 w-5" />
        {chatUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold">
            {chatUnread > 9 ? '9+' : chatUnread}
          </span>
        )}
      </button>
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
