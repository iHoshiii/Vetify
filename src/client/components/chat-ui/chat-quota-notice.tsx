import { Link } from 'react-router-dom';

import { FREE_ANON_QUERIES } from '@/lib/chat-quota';

/** Countdown shown to anonymous visitors while they still have questions left. */
export function ChatQuotaBanner({ remaining }: { remaining: number }) {
  return (
    <p className="border-t border-slate-100 bg-slate-50 px-6 py-2 text-center text-xs text-slate-500">
      {remaining === 1 ? '1 free question left' : `${remaining} free questions left`}
      {' — '}
      <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-800">
        log in
      </Link>{' '}
      to ask as many as you like.
    </p>
  );
}

/**
 * Replaces the composer once the allowance is spent. Deliberately not a modal:
 * the conversation stays readable, so signing in feels like continuing rather
 * than starting over.
 */
export function ChatQuotaLock() {
  return (
    <div className="border-t border-slate-200 bg-slate-50 px-6 py-6 text-center">
      <p className="text-sm font-bold text-slate-800">
        You have used your {FREE_ANON_QUERIES} free questions
      </p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-slate-600">
        Log in to keep chatting with the assistant. Your conversation stays right here.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <Link
          to="/login?reason=chat-quota"
          className="inline-flex h-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 px-5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
        >
          Log in
        </Link>
        <Link
          to="/signup"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
