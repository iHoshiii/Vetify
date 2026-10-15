import { getSocket } from '@/lib/socket';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { CallPeer, CallState } from './call-types';
import { joinCallResult } from './join-call';
import { reconnectCall } from './reconnect-call';
import { useCallError } from './use-call-error';
import { listenCall } from './call-listeners';
import { createPeer, type Signal } from './peer';
import { callPeerController } from './call-peer-controller';
import { useCallChat } from './use-call-chat';
import { useMedia } from './use-media';
import { useCallControls } from './use-call-controls';

export function useCall(appointmentId: string) {
  const { stream, error: mediaError } = useMedia();
  const { user } = useAuth();
  const initialAccount = useRef(user?.id);
  const wantedCall = useRef(true);
  const wantedAppointment = useRef(appointmentId);
  const controls = useCallControls(stream);
  const chat = useCallChat(appointmentId);
  const [state, setState] = useState<CallState>('waiting');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const peerRef = useRef<ReturnType<typeof createPeer> | null>(null);

  useCallError(mediaError, setState, setMessage);

  useEffect(() => {
    if (wantedAppointment.current !== appointmentId) {
      wantedAppointment.current = appointmentId;
      wantedCall.current = true;
      setRemoteStream(null);
      setMessage(null);
    }
    if (!stream) return;
    const socket = getSocket();
    if (!socket) {
      setState('error');
      setMessage('The realtime connection is not ready. Refresh to try again.');
      return;
    }

    let closed = false;
    const send = (signal: Signal) => socket.emit('call:signal', { appointmentId, signal });

    let endTimer: ReturnType<typeof setTimeout> | null = null;
    const controller = callPeerController({
      peerRef,
      stream,
      closed: () => closed || !wantedCall.current,
      send,
      setRemote: setRemoteStream,
      setState,
    });
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

    const unlisten = listenCall(socket, appointmentId, {
      'call:signal': controller.signal,
      'call:peer-joined': controller.peerJoined,
      'call:peer-left': onPeerLeft,
      'call:ended': endNow,
      'session:ended': endNow,
    });

    const join = () =>
      socket.emit(
        'call:join',
        { appointmentId },
        joinCallResult({
          closed: () => closed || !wantedCall.current,
          configure: controller.configure,
          peerHere: controller.peerHere,
          start: controller.start,
          end: endNow,
          setPeer,
          setState,
          setMessage,
          timer: (timer) => {
            if (endTimer) clearTimeout(endTimer);
            endTimer = timer;
          },
        })
      );
    const stopReconnect = reconnectCall(socket, {
      closed: () => closed || !wantedCall.current,
      join,
      reset: controller.reset,
    });
    join();

    return () => {
      closed = true;
      unlisten();
      stopReconnect();
      if (endTimer) clearTimeout(endTimer);
      socket.emit('call:leave', { appointmentId });
      peerRef.current?.close();
      peerRef.current = null;
    };
  }, [stream, appointmentId]);

  const hangUp = useCallback(() => {
    wantedCall.current = false;
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
