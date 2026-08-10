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
    <main className="h-[calc(100vh-57px)] flex overflow-hidden bg-slate-50">
      <ChatSidebar
        sessions={sessions}
        activeId={activeId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatWindow messages={messages} onMessagesChange={setMessages} />
      </div>
    </main>
  );
}
