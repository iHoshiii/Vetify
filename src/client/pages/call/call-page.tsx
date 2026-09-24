import { useAuth } from '@/components/providers/AuthProvider';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import CallChat from './call-chat';
import CallControls from './call-controls';
import CallStage from './call-stage';
import { beatCallActive, endCallActive, markCallVisited } from './call-visited';
import { useCall } from './use-call';

// The rating popup only earns its place after a real session, so both sides must stay connected this long.
const RATE_AFTER_MS = 15 * 60_000;

// The full-screen consultation room. Everything hangs off the one appointment id in the path.
export default function CallPage() {
  const { appointmentId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const call = useCall(appointmentId);
  const [chatOpen, setChatOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  // Stamp when both sides first connect, so a no-show or an early drop can be told apart from a real visit.
  const connectedAt = useRef<number | null>(null);

  useEffect(() => {
    if (call.state === 'connected' && connectedAt.current === null)
      connectedAt.current = Date.now();
  }, [call.state]);

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

  // One side ending the call drops both out: the peer gets peer-left, and this routes each away, sending the owner into a rating popup only after a full session.
  useEffect(() => {
    if (call.state !== 'ended' && call.state !== 'error') return;
    if (user?.role === 'professional') {
      navigate('/professionals/dashboard');
      return;
    }
    const rateable =
      call.state === 'ended' &&
      Boolean(appointmentId) &&
      connectedAt.current !== null &&
      Date.now() - connectedAt.current >= RATE_AFTER_MS;
    navigate('/book-appointment', rateable ? { state: { rate: appointmentId } } : undefined);
  }, [call.state, user?.role, appointmentId, navigate]);

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

      {!finished && (
        <CallControls
          micOn={call.micOn}
          camOn={call.camOn}
          chatOpen={chatOpen}
          chatUnread={unread}
          onToggleChat={() => setChatOpen((open) => !open)}
          onToggleMic={call.toggleMic}
          onToggleCam={call.toggleCam}
          onHangUp={call.hangUp}
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
