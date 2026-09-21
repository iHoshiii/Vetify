import ConversationView from '@/components/messaging/ConversationView';
import ThreadList from '@/components/messaging/ThreadList';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Thread } from '@/services/messages.service';
import { MessagesSquare } from 'lucide-react';
import { useState } from 'react';

// The vet's side of messaging: the owners who have written in, and the open conversation. Same thread list and view the owner's launcher uses, on the incoming side.
export default function ProfessionalConversationsPage() {
  useDocumentTitle('Conversations', 'Messages between you and the pet owners you consult for.');
  const [active, setActive] = useState<Thread | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
        <MessagesSquare className="h-4 w-4 text-teal-800" />
        <div>
          <h1 className="text-base font-black tracking-tight text-slate-900">Conversations</h1>
          <p className="text-xs text-slate-500">
            Messages between you and the pet owners you consult for.
          </p>
        </div>
      </div>

      <div className="h-[32rem] min-h-0">
        {active ? (
          <ConversationView thread={active} onBack={() => setActive(null)} />
        ) : (
          <div className="h-full overflow-y-auto">
            <ThreadList side="incoming" onOpen={setActive} />
          </div>
        )}
      </div>
    </div>
  );
}
