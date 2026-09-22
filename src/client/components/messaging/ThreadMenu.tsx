import {
  useMuteThread,
  useReportThread,
  useSetThreadRead,
  useSetThreadState,
} from '@/hooks/useMessages';
import type { Thread, ThreadState } from '@/services/messages.service';
import { Archive, Ban, BellOff, Flag, Inbox, Mail, MailOpen, Trash2 } from 'lucide-react';
import { useState } from 'react';

import DeleteConfirm from './DeleteConfirm';

type MenuVariant = 'header' | 'row';

export default function ThreadMenu({
  thread,
  variant,
  onDone,
  onCloseThread,
  onMutedChange,
}: {
  thread: Thread;
  variant: MenuVariant;
  onDone: () => void;
  onCloseThread?: () => void;
  onMutedChange?: (muted: boolean) => void;
}) {
  const setState = useSetThreadState();
  const setRead = useSetThreadRead();
  const mute = useMuteThread();
  const report = useReportThread();
  const [error, setError] = useState<string | null>(null);
  // Delete clears the caller's history, so it asks first rather than firing on a single click.
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const runState = async (state: ThreadState) => {
    setError(null);
    try {
      await setState.mutateAsync({ threadId: thread.id, state });
      onDone();
      if (variant === 'header') onCloseThread?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update conversation');
    }
  };

  const runRead = async () => {
    setError(null);
    try {
      await setRead.mutateAsync({ threadId: thread.id, unread: thread.unread === 0 });
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update conversation');
    }
  };

  const runMute = async () => {
    setError(null);
    try {
      const nextMuted = !thread.muted;
      await mute.mutateAsync({ threadId: thread.id, muted: nextMuted });
      onMutedChange?.(nextMuted);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mute conversation');
    }
  };

  const runReport = async () => {
    setError(null);
    try {
      await report.mutateAsync(thread.id);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to report conversation');
    }
  };

  const itemClass =
    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

  if (confirmingDelete) {
    return (
      <DeleteConfirm
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => void runState('deleted')}
        error={error}
      />
    );
  }

  return (
    <div
      role="menu"
      className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
    >
      {variant === 'row' && (
        <button type="button" role="menuitem" onClick={() => void runRead()} className={itemClass}>
          {thread.unread > 0 ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
          {thread.unread > 0 ? 'Mark as Read' : 'Mark as Unread'}
        </button>
      )}

      <button type="button" role="menuitem" onClick={() => void runMute()} className={itemClass}>
        <BellOff className="h-4 w-4" />
        {thread.muted ? 'Unmute' : 'Mute'}
      </button>
      {thread.state !== 'active' && (
        <button
          type="button"
          role="menuitem"
          onClick={() => void runState('active')}
          className={itemClass}
        >
          <Inbox className="h-4 w-4" /> Move to Messages
        </button>
      )}
      {thread.state !== 'archived' && (
        <button
          type="button"
          role="menuitem"
          onClick={() => void runState('archived')}
          className={itemClass}
        >
          <Archive className="h-4 w-4" /> Archive
        </button>
      )}
      {thread.state !== 'spam' && (
        <button
          type="button"
          role="menuitem"
          onClick={() => void runState('spam')}
          className={itemClass}
        >
          <Ban className="h-4 w-4" /> {variant === 'header' ? 'Mark as Spam' : 'Mark as spam'}
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setError(null);
          setConfirmingDelete(true);
        }}
        className={`${itemClass} text-rose-600`}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      {variant === 'header' && (
        <button
          type="button"
          role="menuitem"
          onClick={() => void runReport()}
          className={itemClass}
        >
          <Flag className="h-4 w-4" />
          Report
        </button>
      )}

      {error && (
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}
