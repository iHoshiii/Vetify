import type { Message } from '@/services/messages.service';

import ParticipantAvatar from './ParticipantAvatar';

type Avatar = { name: string; avatarUrl?: string | null };

// Short local time under a bubble, e.g. "2:07 PM".
function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

// One message, sided by who sent it: the viewer's own on the right in teal, the other side left in slate.
export default function MessageBubble({
  message,
  receipt,
  mineAvatar,
  otherAvatar,
}: {
  message: Message;
  receipt?: 'Delivered' | 'Seen' | null;
  mineAvatar: Avatar;
  otherAvatar: Avatar;
}) {
  const mine = message.fromYou;
  const who = mine ? mineAvatar : otherAvatar;

  return (
    <div className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
      <ParticipantAvatar name={who.name} avatarUrl={who.avatarUrl} size="xs" />
      <div className="max-w-[75%] lg:max-w-lg">
        <div
          className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
            mine
              ? 'rounded-br-sm bg-teal-700 text-white'
              : 'rounded-bl-sm bg-slate-100 text-slate-800'
          }`}
        >
          {message.body}
        </div>
        <p className={`mt-0.5 text-[10px] text-slate-400 ${mine ? 'text-right' : 'text-left'}`}>
          {timeOf(message.createdAt)}
        </p>
        {receipt && (
          <p className="mt-0.5 text-right text-[10px] font-semibold text-teal-600">{receipt}</p>
        )}
      </div>
    </div>
  );
}
