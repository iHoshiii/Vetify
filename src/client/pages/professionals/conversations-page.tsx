import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { CalendarCheck, MessagesSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

import { SAMPLE_CONVERSATIONS } from './_components/console-sample-data';

/**
 * The threads between this professional and the pet owners they consult for.
 *
 * Opening one goes to `/chat`, which is where messaging lives; there is no
 * per-thread route yet because there is no per-thread record yet.
 */
export default function ProfessionalConversationsPage() {
  useDocumentTitle('Conversations', 'Messages between you and the pet owners you consult for.');

  const conversations = SAMPLE_CONVERSATIONS;
  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-base font-black tracking-tight text-slate-900">
            <MessagesSquare className="h-4 w-4 text-teal-800" />
            Conversations
          </h1>
          <p className="text-xs text-slate-500">
            Messages between you and the pet owners you consult for.
          </p>
        </div>
        {unreadTotal > 0 && (
          <span className="w-fit rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-900">
            {unreadTotal} unread
          </span>
        )}
      </div>

      {conversations.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">No conversations yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                to="/chat"
                className="flex items-start gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-teal-200 bg-teal-100 text-xs font-black text-teal-800">
                  {c.clientName.charAt(0)}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold text-slate-900">
                      {c.clientName}
                      <span className="ml-1.5 font-semibold text-slate-400">· {c.petName}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400">{c.sentAt}</span>
                  </span>

                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span
                      className={`truncate text-xs ${
                        c.unread > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      {c.lastAuthor === 'you' && <span className="text-slate-400">You: </span>}
                      {c.lastMessage}
                    </span>
                    {c.unread > 0 && (
                      <span className="shrink-0 rounded-full bg-teal-800 px-1.5 text-[10px] font-black text-white">
                        {c.unread}
                      </span>
                    )}
                  </span>

                  {c.linkedAppointmentId && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                      <CalendarCheck className="h-2.5 w-2.5" />
                      {c.linkedAppointmentId}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
