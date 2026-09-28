import { useState } from 'react';

import { passwordChangeSchema } from '@shared/schemas';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChangePassword } from '@/hooks/useAccount';
import { SaveRow } from './controls';

const FIELD =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700';

export default function PasswordForm() {
  const { user } = useAuth();
  const mutation = useChangePassword();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Provider accounts sign in elsewhere and carry no password, so there is nothing to change here.
  if (user && user.provider !== 'local') {
    return (
      <p className="px-1 text-sm text-slate-500">
        You sign in with {user.provider}, so there is no password to change here.
      </p>
    );
  }

  // Collapsed by default so the fields are not sitting open every time the section is.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
      >
        Change password
      </button>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const check = passwordChangeSchema.shape.newPassword.safeParse(next);
    if (!check.success)
      return setFormError(check.error.issues[0]?.message ?? 'Choose a stronger password.');
    if (next.trim() !== confirm.trim()) return setFormError('The new passwords do not match.');
    setFormError(null);
    mutation.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
          setConfirm('');
        },
      }
    );
  };

  const close = () => {
    setOpen(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    setFormError(null);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700">Change password</span>
        <button
          type="button"
          onClick={close}
          className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
        >
          Cancel
        </button>
      </div>
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
        label="Update password"
      />
    </form>
  );
}
