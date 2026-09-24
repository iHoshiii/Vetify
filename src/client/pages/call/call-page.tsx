import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import CallChat from './call-chat';
import CallControls from './call-controls';
import CallStage from './call-stage';
import { beatCallActive, endCallActive, markCallVisited } from './call-visited';
import { useCall } from './use-call';

// The full-screen consultation room. Everything hangs off the one appointment id in the path.
export default function CallPage() {
  const { appointmentId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const call = useCall(appointmentId);
  const [chatOpen, setChatOpen] = useState(false);
  const [seen, setSeen] = useState(0);

  // Mark the visit for the 'Rejoin' label, and beat a heartbeat so any other tab reads 'Ongoing' and cannot open a second way into the same call.
  useEffect(() => {
    if (!appointmentId) return;
    markCallVisited(appointmentId);
    beatCallActive(appointmentId);
    const id = setInterval(() => beatCallActive(appointmentId), 4_000);
    return () => {
      clearInterval(id);
      endCallActive(appointmentId);
    };
  }, [appointmentId]);

  const fromThem = call.messages.filter((m) => !m.mine).length;
  const unread = chatOpen ? 0 : Math.max(0, fromThem - seen);

  // Clear the badge while the panel is open, and keep it clear as new lines land.
  useEffect(() => {
    if (chatOpen) setSeen(fromThem);
  }, [chatOpen, fromThem]);

  // Back to wherever this booking lives for the caller: the vet's queue or the owner's list.
  const exit = () =>
    navigate(user?.role === 'professional' ? '/professionals/dashboard' : '/book-appointment');

  const finished = call.state === 'ended' || call.state === 'error';

  return (
    <main className="flex h-[100dvh] min-h-[32rem] w-full flex-col gap-4 bg-slate-50 p-3 sm:p-5 lg:p-6">
      <CallStage
        state={call.state}
        message={call.message}
        peer={call.peer}
        localStream={call.localStream}
        remoteStream={call.remoteStream}
      />

      {finished ? (
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={exit}
            className="rounded-full bg-teal-700 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
          >
            Back to appointments
          </button>
        </div>
      ) : (
        <CallControls
          micOn={call.micOn}
          camOn={call.camOn}
          chatOpen={chatOpen}
          chatUnread={unread}
          onToggleChat={() => setChatOpen((open) => !open)}
          onToggleMic={call.toggleMic}
          onToggleCam={call.toggleCam}
          onHangUp={() => {
            call.hangUp();
            exit();
          }}
        />
      )}

      {!finished && (
        <CallChat
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          messages={call.messages}
          onSend={call.sendChat}
          me={{ name: user?.name ?? 'You', avatarUrl: user?.avatarUrl }}
          peer={call.peer}
        />
      )}
    </main>
  );
}
