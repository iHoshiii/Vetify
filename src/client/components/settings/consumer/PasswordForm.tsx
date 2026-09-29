import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { passwordChangeSchema } from '@shared/schemas';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChangePassword } from '@/hooks/useAccount';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { FIELD, SaveRow } from './controls';

export default function PasswordForm() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const mutation = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const dirty = Boolean(current || next || confirm);
  useUnsavedGuard(dirty);

  if (user && user.provider !== 'local') {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        You sign in with <strong>{user.provider}</strong>. Your password is managed by that
        provider.
      </div>
    );
  }

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setFormError(null);
    mutation.reset();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const check = passwordChangeSchema.safeParse({ currentPassword: current, newPassword: next });
    if (!check.success)
      return setFormError(check.error.issues[0]?.message ?? 'Check your password.');
    if (next !== confirm) return setFormError('The new passwords do not match.');
    setFormError(null);
    try {
      await mutation.mutateAsync(check.data);
    } catch {
      return;
    }
    await logout();
    navigate('/login', {
      replace: true,
      state: { message: 'Password updated. Sign in again on this device.' },
    });
  };

  const input = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    autoComplete: string
  ) => (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required
        className={FIELD}
      />
    </label>
  );

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      {input('Current password', current, setCurrent, 'current-password')}
      {input('New password', next, setNext, 'new-password')}
      {input('Confirm new password', confirm, setConfirm, 'new-password')}
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="text-sm font-bold text-teal-800 underline decoration-teal-800/30 underline-offset-4"
      >
        {visible ? 'Hide passwords' : 'Show passwords'}
      </button>
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        Use at least 8 characters with an uppercase letter, number, and special character. Updating
        your password signs out every device.
      </p>
      <SaveRow
        pending={mutation.isPending}
        error={formError ?? mutation.error?.message ?? null}
        saved={false}
        dirty={dirty}
        label="Update password"
        onReset={reset}
      />
    </form>
  );
}
