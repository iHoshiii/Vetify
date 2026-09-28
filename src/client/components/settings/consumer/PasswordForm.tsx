import { useState } from 'react';

import { useAuth } from '@/components/providers/AuthProvider';
import { useChangePassword } from '@/hooks/useAccount';
import { SaveRow } from './controls';

const FIELD =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700';

export default function PasswordForm() {
  const { user } = useAuth();
  const mutation = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');

  // Provider accounts sign in elsewhere and carry no password, so there is nothing to change here.
  if (user && user.provider !== 'local') {
    return (
      <p className="px-1 text-sm text-slate-500">
        You sign in with {user.provider}, so there is no password to change here.
      </p>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
        },
      }
    );
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-bold text-slate-700">Current password</span>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className={FIELD}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-bold text-slate-700">New password</span>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          className={FIELD}
        />
      </label>
      <SaveRow
        pending={mutation.isPending}
        error={mutation.error?.message ?? null}
        saved={mutation.isSuccess}
        label="Change password"
      />
    </form>
  );
}
