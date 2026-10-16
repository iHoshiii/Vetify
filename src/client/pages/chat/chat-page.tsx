import ChatWindow from '@/components/chat-ui';
import { useChatStorage } from '@/hooks/useChatStorage';
import ChatSidebar from './_components/chat-sidebar';

export default function ChatPage() {
  const {
    sessions,
    activeId,
    messages,
    setMessages,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
  } = useChatStorage();

  return (
    <main className="h-[calc(var(--viewport-height,100dvh)-var(--site-header-height,68px))] min-h-0 flex overflow-hidden bg-slate-50">
      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <ChatWindow messages={messages} onMessagesChange={setMessages} />
      </div>
    </main>
  );
}
