import { useAuth } from '@/components/providers/AuthProvider';
import { useNavigate, useParams } from 'react-router-dom';

import CallChat from './call-chat';
import CallControls from './call-controls';
import CallStage from './call-stage';
import { useCall } from './use-call';

// The full-screen consultation room. Everything hangs off the one appointment id in the path.
export default function CallPage() {
  const { appointmentId = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const call = useCall(appointmentId);

  // Back to wherever this booking lives for the caller: the vet's queue or the owner's list.
  const exit = () =>
    navigate(user?.role === 'professional' ? '/professionals/dashboard' : '/book-appointment');

  const finished = call.state === 'ended' || call.state === 'error';

  return (
    <main className="flex h-[100dvh] min-h-[32rem] w-full flex-col gap-4 bg-slate-50 p-3 sm:p-5 lg:p-6">
      <CallStage
        state={call.state}
        message={call.message}
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
          onToggleMic={call.toggleMic}
          onToggleCam={call.toggleCam}
          onHangUp={() => {
            call.hangUp();
            exit();
          }}
        />
      )}

      {!finished && <CallChat messages={call.messages} onSend={call.sendChat} />}
    </main>
  );
}
