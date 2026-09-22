import { useAuth } from '@/components/providers/AuthProvider';
import ConversationView from '@/components/messaging/ConversationView';
import MessageSideTabs from '@/components/messaging/MessageSideTabs';
import ThreadList from '@/components/messaging/ThreadList';
import type { Thread, ThreadSide } from '@/services/messages.service';
import { useEffect, useState } from 'react';

// The dedicated full-page inbox behind the Tools "Chat" link, roomier than the launcher popup.
export default function MessagesPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<Thread | null>(null);
  const [side, setSide] = useState<ThreadSide>('mine');
  const isProfessional = user?.role === 'professional';

  useEffect(() => {
    if (isProfessional) setSide('incoming');
  }, [isProfessional]);

  const changeSide = (next: ThreadSide) => {
    setSide(next);
    setActive(null);
  };

  return (
    <main className="flex h-[calc(100vh-4rem)] min-h-[32rem] w-full gap-3 bg-slate-50 p-3 sm:gap-4 sm:p-5 lg:p-6">
      <section
        className={`${
          active ? 'hidden sm:flex' : 'flex'
        } w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:w-80 sm:shrink-0 lg:w-96`}
      >
        <header className="space-y-3 border-b border-slate-200 px-3 py-3">
          <h1 className="text-lg font-black text-slate-900">Chat</h1>
          {isProfessional && <MessageSideTabs side={side} onChange={changeSide} />}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ThreadList side={isProfessional ? side : 'mine'} onOpen={setActive} />
        </div>
      </section>

      <section
        className={`${
          active ? 'flex' : 'hidden sm:flex'
        } min-w-0 flex-1 items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}
      >
        {active ? (
          <ConversationView thread={active} onBack={() => setActive(null)} />
        ) : (
          <p className="m-auto text-sm text-slate-400">Pick a conversation to start reading.</p>
        )}
      </section>
    </main>
  );
}
