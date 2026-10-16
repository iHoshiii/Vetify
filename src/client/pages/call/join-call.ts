import type { JoinAck, CallPeer, CallState } from './call-types';
import type { IceServer } from './peer';

export function joinCallResult(options: {
  closed: () => boolean;
  configure: (value: { iceServers: IceServer[]; polite: boolean }) => void;
  peerHere: () => boolean;
  start: () => void;
  end: () => void;
  setPeer: (peer: CallPeer) => void;
  setState: (state: CallState) => void;
  setMessage: (message: string) => void;
  timer: (timer: ReturnType<typeof setTimeout>) => void;
}) {
  return (ack: JoinAck) => {
    if (options.closed()) return;
    if (!ack.ok) {
      options.setState('error');
      options.setMessage(
        ack.error === 'call is full'
          ? 'This call already has two people in it.'
          : 'This call is not open to you right now.'
      );
      return;
    }
    options.configure({ iceServers: ack.iceServers, polite: ack.polite });
    options.setPeer(ack.peer);
    options.timer(
      setTimeout(options.end, Math.max(0, new Date(ack.endsAt).getTime() - Date.now()))
    );
    const peerHere = ack.peerOnline || options.peerHere();
    options.setState(peerHere ? 'connecting' : 'waiting');
    if (peerHere) options.start();
  };
}
