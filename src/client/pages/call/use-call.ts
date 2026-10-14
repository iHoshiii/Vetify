import { getSocket } from '@/lib/socket';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CallPeer, CallState, JoinAck } from './call-types';
import { createPeer, type IceServer, type Signal } from './peer';
import { useCallChat } from './use-call-chat';
import { useMedia } from './use-media';
import { useCallControls } from './use-call-controls';

export function useCall(appointmentId: string) {
  const { stream, error: mediaError } = useMedia();
  const { user } = useAuth();
  const initialAccount = useRef(user?.id);
  const controls = useCallControls(stream);
  const chat = useCallChat(appointmentId);
  const [state, setState] = useState<CallState>('waiting');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
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

    const pending: Signal[] = [];
    let config: { iceServers: IceServer[]; polite: boolean } | null = null;
    let peerArrived = false;
    let endTimer: ReturnType<typeof setTimeout> | null = null;

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
      peerArrived = true;
      setState((current) => (current === 'connected' ? current : 'connecting'));
      startPeer();
    };
    const endNow = () => {
      peerRef.current?.close();
      peerRef.current = null;
      setRemoteStream(null);
      setState('ended');
    };
    const onPeerLeft = () => {
      if (closed) return;
      endNow();
      setMessage('The other person left the call.');
    };

    socket.on('call:signal', onSignal);
    socket.on('call:peer-joined', onPeerJoined);
    socket.on('call:peer-left', onPeerLeft);
    socket.on('call:ended', endNow);
    socket.on('session:ended', endNow);

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
      setPeer(ack.peer);
      endTimer = setTimeout(endNow, new Date(ack.endsAt).getTime() - Date.now());
      const peerHere = ack.peerOnline || peerArrived;
      setState(peerHere ? 'connecting' : 'waiting');
      if (peerHere) startPeer();
    });

    return () => {
      closed = true;
      socket.off('call:signal', onSignal);
      socket.off('call:peer-joined', onPeerJoined);
      socket.off('call:peer-left', onPeerLeft);
      socket.off('call:ended', endNow);
      socket.off('session:ended', endNow);
      if (endTimer) clearTimeout(endTimer);
      socket.emit('call:leave', { appointmentId });
      peerRef.current?.close();
      peerRef.current = null;
    };
  }, [stream, appointmentId]);

  const hangUp = useCallback(() => {
    getSocket()?.emit('call:leave', { appointmentId });
    peerRef.current?.close();
    peerRef.current = null;
    setState('ended');
  }, [appointmentId]);

  useEffect(() => {
    if (user?.id === initialAccount.current) return;
    hangUp();
    stream?.getTracks().forEach((track) => track.stop());
  }, [user?.id, hangUp, stream]);

  return {
    state,
    message,
    localStream: stream,
    remoteStream,
    peer,
    ...controls,
    hangUp,
    messages: chat.messages,
    sendChat: chat.sendChat,
  };
}
