import type { Message } from '@/services/messages.service';

// A fetched outgoing message reached the server; it becomes seen once the far side catches up.
export function deliveryStatus(
  otherReadAt: string | null,
  messages: Message[]
): 'Delivered' | 'Seen' | null {
  const lastMine = [...messages].reverse().find((message) => message.fromYou);
  if (!lastMine) return null;
  if (!otherReadAt) return 'Delivered';

  return new Date(otherReadAt).getTime() >= new Date(lastMine.createdAt).getTime()
    ? 'Seen'
    : 'Delivered';
}

export default function ConversationStatus({ typing }: { typing: boolean }) {
  if (typing) {
    return <p className="px-3 pb-1 text-[11px] italic text-slate-400">typing…</p>;
  }
  return null;
}
