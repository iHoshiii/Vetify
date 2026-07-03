'use client';

import ChatWindow from '@/components/ChatWindow';

export default function ChatPage() {
  return (
    <main className="h-[calc(100vh-57px)] flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 shadow-sm">
              <span className="text-sm">🐾</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Vetify AI Assistant</h1>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-teal-600">
            <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
            Online
          </span>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden mx-auto w-full max-w-3xl flex flex-col">
        <ChatWindow />
      </div>
    </main>
  );
}
