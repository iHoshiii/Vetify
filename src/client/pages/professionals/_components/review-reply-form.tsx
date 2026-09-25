import { useReplyToReview } from '@/hooks/useReviews';
import { REVIEW_REPLY_MAX } from '@shared/limits';
import { useState } from 'react';

// One reply composer under an unanswered review. Scoped to a single appointment, it posts the vet's response and clears itself; the invalidation the hook fires swaps the box for the saved reply on the next render.
export default function ReviewReplyForm({
  appointmentId,
  professionalId,
}: {
  appointmentId: string;
  professionalId: string;
}) {
  const [reply, setReply] = useState('');
  const mutation = useReplyToReview(professionalId);
  const text = reply.trim();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!text || mutation.isPending) return;
    mutation.mutate({ id: appointmentId, reply: text });
  }

  return (
    <form onSubmit={submit} className="mt-2">
      <textarea
        value={reply}
        onChange={(event) => setReply(event.target.value)}
        maxLength={REVIEW_REPLY_MAX}
        rows={2}
        placeholder="Write a public response"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-xs text-rose-600">
          {mutation.isError ? mutation.error.message : ''}
        </span>
        <button
          type="submit"
          disabled={!text || mutation.isPending}
          className="rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-900 disabled:bg-slate-300"
        >
          {mutation.isPending ? 'Posting…' : 'Post reply'}
        </button>
      </div>
    </form>
  );
}
