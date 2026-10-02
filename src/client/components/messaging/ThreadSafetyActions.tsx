import { useReportThread } from '@/hooks/useMessages';
import { useBlockUser } from '@/hooks/usePreferences';
import type { Thread } from '@/services/messages.service';
import { Flag, ShieldBan } from 'lucide-react';

export default function ThreadSafetyActions({
  thread,
  itemClass,
  onDone,
  onCloseThread,
  onError,
}: {
  thread: Thread;
  itemClass: string;
  onDone: () => void;
  onCloseThread?: () => void;
  onError: (error: string | null) => void;
}) {
  const report = useReportThread();
  const block = useBlockUser();

  const runReport = async () => {
    onError(null);
    try {
      await report.mutateAsync(thread.id);
      onDone();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Unable to report conversation');
    }
  };

  const runBlock = async () => {
    if (
      !thread.with ||
      !window.confirm(
        `Block ${
          thread.with.name ?? thread.with.email
        }? You will no longer be able to message each other.`
      )
    )
      return;
    onError(null);
    try {
      await block.mutateAsync(thread.with.id);
      onDone();
      onCloseThread?.();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'Unable to block account');
    }
  };

  return (
    <>
      <button type="button" role="menuitem" onClick={() => void runReport()} className={itemClass}>
        <Flag className="h-4 w-4" /> Report
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => void runBlock()}
        className={`${itemClass} text-rose-600`}
      >
        <ShieldBan className="h-4 w-4" /> Block account
      </button>
    </>
  );
}
