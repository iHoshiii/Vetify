import {
  type ChatSession,
  type Message,
  deleteSession,
  deriveTitle,
  loadSessions,
  newSessionId,
  saveSession,
} from '@/lib/chat-storage';
import { useEffect, useState } from 'react';

export function useChatStorage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);

  // Load initial sessions on mount
  useEffect(() => {
    const stored = loadSessions();
    setSessions(stored);
    setActiveId(newSessionId());
  }, []);

  // Save session state whenever messages change
  useEffect(() => {
    if (!activeId || messages.length === 0) return;

    const session: ChatSession = {
      id: activeId,
      title: deriveTitle(messages),
      messages,
      updatedAt: Date.now(),
    };

    saveSession(session);
    setSessions(loadSessions());
  }, [messages, activeId]);

  const handleNewChat = () => {
    setActiveId(newSessionId());
    setMessages([]);
  };

  const handleSelectSession = (session: ChatSession) => {
    setActiveId(session.id);
    setMessages(session.messages);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    const updated = loadSessions();
    setSessions(updated);
    if (id === activeId) handleNewChat();
  };

  return {
    sessions,
    activeId,
    messages,
    setMessages,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
  };
}

export default useChatStorage;
