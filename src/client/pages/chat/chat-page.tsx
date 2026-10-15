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
    <main className="flex h-[calc(var(--viewport-height,100dvh)-var(--site-header-height,68px))] min-h-[32rem] flex-col overflow-hidden bg-slate-50 xl:min-h-0 xl:flex-row">
      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ChatWindow messages={messages} onMessagesChange={setMessages} />
      </div>
    </main>
  );
}
