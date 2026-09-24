import { getSocket } from '@/lib/socket';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createPeer, type IceServer, type Signal } from './peer';
import { useCallChat } from './use-call-chat';
import { useMedia } from './use-media';

export type CallState = 'waiting' | 'connecting' | 'connected' | 'ended' | 'error';

type JoinAck =
  | { ok: true; iceServers: IceServer[]; peerOnline: boolean; polite: boolean }
  | { ok: false; error: string };

// Ties the camera, the peer connection, and the signalling socket together behind one call state.
export function useCall(appointmentId: string) {
  const { stream, error: mediaError } = useMedia();
  const chat = useCallChat(appointmentId);
  const [state, setState] = useState<CallState>('waiting');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const peerRef = useRef<ReturnType<typeof createPeer> | null>(null);

  useEffect(() => {
    if (mediaError) {
      setState('error');
      setMessage(mediaError);
    }
  }, [mediaError]);

  useEffect(() => {
    if (!stream) return;
    const socket = getSocket();
    if (!socket) {
      setState('error');
      setMessage('The realtime connection is not ready. Refresh to try again.');
      return;
    }

    let closed = false;
    const send = (signal: Signal) => socket.emit('call:signal', { appointmentId, signal });

    const onSignal = ({ signal }: { signal: Signal }) => void peerRef.current?.handleSignal(signal);
    const onPeerJoined = () =>
      !closed && setState((current) => (current === 'connected' ? current : 'connecting'));
    const onPeerLeft = () => {
      if (closed) return;
      setState('ended');
      setMessage('The other person left the call.');
    };

    socket.on('call:signal', onSignal);
    socket.on('call:peer-joined', onPeerJoined);
    socket.on('call:peer-left', onPeerLeft);

    socket.emit('call:join', { appointmentId }, (ack: JoinAck) => {
      if (closed) return;
      if (!ack.ok) {
        setState('error');
        setMessage(
          ack.error === 'call is full'
            ? 'This call already has two people in it.'
            : 'This call is not open to you right now.'
        );
        return;
      }
      setState(ack.peerOnline ? 'connecting' : 'waiting');
      peerRef.current = createPeer({
        iceServers: ack.iceServers,
        polite: ack.polite,
        stream,
        sendSignal: send,
        onRemote: setRemoteStream,
        onConnected: () => !closed && setState('connected'),
        onClosed: () => !closed && setState((current) => (current === 'ended' ? current : 'ended')),
      });
    });

    return () => {
      closed = true;
      socket.off('call:signal', onSignal);
      socket.off('call:peer-joined', onPeerJoined);
      socket.off('call:peer-left', onPeerLeft);
      socket.emit('call:leave', { appointmentId });
      peerRef.current?.close();
      peerRef.current = null;
    };
  }, [stream, appointmentId]);

  const toggleMic = useCallback(() => {
    if (!stream) return;
    const next = !micOn;
    stream.getAudioTracks().forEach((track) => (track.enabled = next));
    setMicOn(next);
  }, [stream, micOn]);

  const toggleCam = useCallback(() => {
    if (!stream) return;
    const next = !camOn;
    stream.getVideoTracks().forEach((track) => (track.enabled = next));
    setCamOn(next);
  }, [stream, camOn]);

  const hangUp = useCallback(() => {
    getSocket()?.emit('call:leave', { appointmentId });
    peerRef.current?.close();
    peerRef.current = null;
    setState('ended');
  }, [appointmentId]);

  return {
    state,
    message,
    localStream: stream,
    remoteStream,
    micOn,
    camOn,
    toggleMic,
    toggleCam,
    hangUp,
    messages: chat.messages,
    sendChat: chat.sendChat,
  };
}
