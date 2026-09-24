import { getSocket } from '@/lib/socket';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ChatMessage = { id: string; mine: boolean; text: string };

// In-call text chat relayed through the call room, so a muted participant can still talk. Ephemeral, not stored.
export function useCallChat(appointmentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onChat = ({ text }: { text: string }) =>
      setMessages((prev) => [...prev, { id: `p${nextId.current++}`, mine: false, text }]);
    socket.on('call:chat', onChat);
    return () => {
      socket.off('call:chat', onChat);
    };
  }, [appointmentId]);

  const sendChat = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      getSocket()?.emit('call:chat', { appointmentId, text });
      setMessages((prev) => [...prev, { id: `m${nextId.current++}`, mine: true, text }]);
    },
    [appointmentId]
  );

  return { messages, sendChat };
}
