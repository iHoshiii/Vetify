import { type ChatSession } from '@/lib/chat-storage';
import React from 'react';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeId: string;
  onNewChat: () => void;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (id: string) => void;
}

export default function ChatSidebar({
  sessions,
  activeId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
}: ChatSidebarProps) {
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteSession(id);
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <button
          onClick={onNewChat}
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
              onClick={() => onSelectSession(s)}
              className={`group flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
                s.id === activeId ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">🐾</span>
                <span className="text-xs font-medium truncate">{s.title}</span>
              </div>
              <button
                onClick={(e) => handleDelete(e, s.id)}
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
  );
}
