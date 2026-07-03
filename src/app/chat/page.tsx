'use client';

import { useEffect, useState } from 'react';
import ChatWindow from '@/components/ChatWindow';
import {
  type ChatSession,
  type Message,
  deleteSession,
  deriveTitle,
  loadSessions,
  newSessionId,
  saveSession,
} from '@/lib/chat-storage';

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = loadSessions();
    setSessions(stored);
    const id = newSessionId();
    setActiveId(id);
  }, []);

  // Save session whenever messages change
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
    const id = newSessionId();
    setActiveId(id);
    setMessages([]);
  };

  const handleSelectSession = (session: ChatSession) => {
    setActiveId(session.id);
    setMessages(session.messages);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSession(id);
    setSessions(loadSessions());
    if (id === activeId) handleNewChat();
  };

  return (
    <main className="h-[calc(100vh-57px)] flex overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-teal-500 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-2">
            Recent
          </p>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400 px-2">No recent chats yet.</p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => handleSelectSession(s)}
                className={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                  s.id === activeId
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">🐾</span>
                  <span className="text-xs font-medium truncate">{s.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatWindow messages={messages} onMessagesChange={setMessages} />
      </div>
    </main>
  );
}
