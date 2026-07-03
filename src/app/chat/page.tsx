'use client';

import ChatWindow from '@/components/ChatWindow';

export default function ChatPage() {
  return (
    <main className="h-[calc(100vh-57px)] flex flex-col bg-slate-50">
      <div className="flex-1 overflow-hidden w-full flex flex-col">
        <ChatWindow />
      </div>
    </main>
  );
}
