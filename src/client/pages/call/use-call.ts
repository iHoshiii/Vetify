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

    // Signals arriving before the peer exists are held, so an offer racing ahead of our join ack is not dropped.
    const pending: Signal[] = [];
    let config: { iceServers: IceServer[]; polite: boolean } | null = null;

    // Built only once the other side is in the room, so our first offer never goes to an empty room and strands us.
    const startPeer = () => {
      if (closed || peerRef.current || !config) return;
      peerRef.current = createPeer({
        iceServers: config.iceServers,
        polite: config.polite,
        stream,
        sendSignal: send,
        onRemote: setRemoteStream,
        onConnected: () => !closed && setState('connected'),
        onClosed: () => !closed && setState((current) => (current === 'ended' ? current : 'ended')),
      });
      for (const signal of pending.splice(0)) void peerRef.current.handleSignal(signal);
    };

    const onSignal = ({ signal }: { signal: Signal }) => {
      if (peerRef.current) void peerRef.current.handleSignal(signal);
      else pending.push(signal);
    };
    const onPeerJoined = () => {
      if (closed) return;
      setState((current) => (current === 'connected' ? current : 'connecting'));
      startPeer();
    };
    const onPeerLeft = () => {
      if (closed) return;
      // drop the frozen last frame and close the dead peer so the tile clears instead of freezing
      peerRef.current?.close();
      peerRef.current = null;
      setRemoteStream(null);
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
      config = { iceServers: ack.iceServers, polite: ack.polite };
      setState(ack.peerOnline ? 'connecting' : 'waiting');
      // Second to arrive: the other side is already waiting, so build now and let our offer reach them.
      if (ack.peerOnline) startPeer();
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
