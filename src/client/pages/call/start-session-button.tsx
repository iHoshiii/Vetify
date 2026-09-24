import { Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useJoinWindow } from './use-join-window';

type Variant = 'block' | 'inline';

type StartSessionButtonProps = {
  appointmentId: string;
  startsAt: string;
  minutes: number;
  variant?: Variant;
};

const BLOCK = 'inline-flex h-9 items-center rounded-lg px-4 text-sm font-bold';
const INLINE =
  'inline-flex items-center gap-1 rounded px-3 py-1 text-xs font-bold transition-colors';

// The gated way into the room, driven by the same window the server enforces so the button never lies about being open.
export default function StartSessionButton({
  appointmentId,
  startsAt,
  minutes,
  variant = 'block',
}: StartSessionButtonProps) {
  const navigate = useNavigate();
  const phase = useJoinWindow(startsAt, minutes);
  const base = variant === 'block' ? BLOCK : INLINE;

  if (phase === 'open') {
    return (
      <button
        type="button"
        onClick={() => navigate(`/call/${appointmentId}`)}
        className={`${base} bg-teal-800 text-white hover:bg-teal-900`}
      >
        {variant === 'inline' && <Video className="h-3 w-3" />} Start the session
      </button>
    );
  }

  const copy = phase === 'before' ? 'Opens 15 minutes before the start' : 'This session has ended';
  return <span className={`${base} bg-slate-100 text-slate-500`}>{copy}</span>;
}
