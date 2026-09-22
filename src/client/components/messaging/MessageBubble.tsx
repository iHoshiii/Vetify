import { useLongPress } from '@/hooks/useLongPress';
import type { Message } from '@/services/messages.service';
import { MESSAGE_ACTION_WINDOW_MS } from '@shared/limits';
import { useEffect, useState } from 'react';

import MessageEditor from './MessageEditor';
import MessageMeta from './MessageMeta';
import MessageMenu from './MessageMenu';
import ParticipantAvatar from './ParticipantAvatar';
import UnsendConfirm from './UnsendConfirm';

type Avatar = { name: string; avatarUrl?: string | null };

type Props = {
  message: Message;
  receipt?: 'Delivered' | 'Seen' | null;
  mineAvatar: Avatar;
  otherAvatar: Avatar;
  showTime: boolean;
  busy: boolean;
  onEdit: (body: string) => Promise<unknown>;
  onUnsend: () => Promise<unknown>;
};

export default function MessageBubble({
  message,
  receipt,
  mineAvatar,
  otherAvatar,
  showTime,
  busy,
  onEdit,
  onUnsend,
}: Props) {
  const [expandedTime, setExpandedTime] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentAt = new Date(message.createdAt).getTime();
  const [windowOpen, setWindowOpen] = useState(
    () => Date.now() - sentAt <= MESSAGE_ACTION_WINDOW_MS
  );
  const mine = message.fromYou;
  const actionable = mine && !message.unsentAt && !message.id.startsWith('pending-') && windowOpen;
  const longPress = useLongPress(() => actionable && setMenuOpen(true));
  const who = mine ? mineAvatar : otherAvatar;
  const edited = Boolean(message.editedAt && !message.unsentAt);
  const metaLines = Number(showTime || expandedTime || edited) + Number(Boolean(receipt));
  const metaSpace = metaLines > 1 ? 'mb-8' : metaLines === 1 ? 'mb-4' : '';

  useEffect(() => {
    if (!windowOpen) return;
    const remaining = sentAt + MESSAGE_ACTION_WINDOW_MS - Date.now();
    if (remaining <= 0) return;
    const timer = setTimeout(() => setWindowOpen(false), remaining + 1);
    return () => clearTimeout(timer);
  }, [sentAt, windowOpen]);

  const save = async (body: string) => {
    setError(null);
    try {
      await onEdit(body);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to edit message');
    }
  };

  const unsend = async () => {
    setError(null);
    try {
      await onUnsend();
      setConfirming(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to unsend message');
    }
  };

  return (
    <div
      className={`group relative flex items-end gap-2 ${mine ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <ParticipantAvatar name={who.name} avatarUrl={who.avatarUrl} size="xs" />
      <div className={`relative max-w-[75%] lg:max-w-lg ${metaSpace}`}>
        {editing ? (
          <MessageEditor
            body={message.body}
            busy={busy}
            onCancel={() => {
              setEditing(false);
              setError(null);
            }}
            onSave={(body) => void save(body)}
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label="Show message date and time"
            onClick={() => setExpandedTime((shown) => !shown)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setExpandedTime((shown) => !shown);
            }}
            {...longPress}
            className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
              mine
                ? 'rounded-br-sm bg-teal-700 text-white'
                : 'rounded-bl-sm bg-slate-100 text-slate-800'
            } ${message.unsentAt ? 'italic opacity-75' : ''}`}
          >
            {message.unsentAt ? 'Message was unsent' : message.body}
          </div>
        )}
        <MessageMeta
          createdAt={message.createdAt}
          expanded={expandedTime}
          showTime={showTime}
          edited={edited}
          mine={mine}
          receipt={receipt}
        />
        {error && !confirming && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        {actionable && !editing && (
          <MessageMenu
            open={menuOpen}
            onToggle={() => setMenuOpen((open) => !open)}
            onEdit={() => {
              setEditing(true);
              setMenuOpen(false);
              setError(null);
            }}
            onUnsend={() => {
              setConfirming(true);
              setMenuOpen(false);
              setError(null);
            }}
          />
        )}
      </div>
      {confirming && (
        <UnsendConfirm
          busy={busy}
          error={error}
          onCancel={() => {
            setConfirming(false);
            setError(null);
          }}
          onConfirm={() => void unsend()}
        />
      )}
    </div>
  );
}
