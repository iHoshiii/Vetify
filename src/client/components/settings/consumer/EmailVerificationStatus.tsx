import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { requestEmailVerification } from '@/services/email-verification.service';

export default function EmailVerificationStatus() {
  const { user } = useAuth();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function resend() {
    setPending(true);
    setMessage('');
    setError('');
    try {
      const response = await requestEmailVerification();
      setMessage(response.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send a verification link.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Email address
      </span>
      <span className="mt-1 block break-all text-sm font-semibold text-slate-800">
        {user?.email}
      </span>
      <span
        className={`mt-1 block text-xs font-bold ${
          user?.emailVerified ? 'text-emerald-700' : 'text-amber-700'
        }`}
      >
        {user?.emailVerified ? 'Verified' : 'Verification pending'}
      </span>
      {user?.provider === 'local' && !user.emailVerified && (
        <button
          type="button"
          onClick={() => void resend()}
          disabled={pending}
          className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-50"
        >
          {pending ? 'Sending verification link...' : 'Resend verification email'}
        </button>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm text-teal-800">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
