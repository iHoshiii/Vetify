import type { Message } from '@/services/messages.service';

// A fetched outgoing message reached the server; it becomes seen once the far side catches up.
export function deliveryStatus(
  otherReadAt: string | null,
  messages: Message[]
): 'Delivered' | 'Seen' | null {
  const lastMine = [...messages].reverse().find((message) => message.fromYou && !message.unsentAt);
  if (!lastMine) return null;
  if (!otherReadAt) return 'Delivered';

  return new Date(otherReadAt).getTime() >= new Date(lastMine.createdAt).getTime()
    ? 'Seen'
    : 'Delivered';
}

export default function ConversationStatus({
  typing,
  error,
}: {
  typing: boolean;
  error?: string | null;
}) {
  if (!typing && !error) return null;

  return (
    <>
      {error && (
        <p role="alert" className="px-4 py-1 text-xs font-semibold text-rose-600">
          {error}
        </p>
      )}
      {typing && (
        <div className="px-3 pb-2" role="status" aria-live="polite" aria-label="Typing">
          <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500"
                style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span className="sr-only">The other person is typing</span>
        </div>
      )}
    </>
  );
}
