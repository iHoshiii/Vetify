import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPasswordSchema, type AccountLoginMethods } from '@shared/account-auth';
import { useAuth } from '@/components/providers/AuthProvider';
import { useAddAccountPassword, useReauthenticateAccount } from '@/hooks/useAccountLoginMethods';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { openAccountAuthUrl } from '@/services/account-auth.service';
import { ApiError } from '@/services/api';
import { accountAuthError, PROVIDER_NAMES } from './account-auth-feedback';
import { FIELD, SaveRow } from './controls';

type Props = { methods: AccountLoginMethods; onProofExpired: () => void };

export default function AddPasswordForm({ methods, onProofExpired }: Props) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const mutation = useAddAccountPassword();
  const proof = useReauthenticateAccount();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = Boolean(password || confirm);
  useUnsavedGuard(dirty && !mutation.isSuccess);

  const authenticate = async () => {
    setError(null);
    try {
      const { url } = await proof.mutateAsync();
      openAccountAuthUrl(url);
    } catch (cause) {
      setError(accountAuthError(cause, 'We could not confirm your sign-in. Please try again.'));
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = addPasswordSchema.safeParse({ newPassword: password, confirmPassword: confirm });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check your password.');
    setError(null);
    try {
      await mutation.mutateAsync(parsed.data);
    } catch (cause) {
      setError(accountAuthError(cause, 'We could not add your password. Please try again.'));
      if (cause instanceof ApiError && cause.reason === 'reauth-required') onProofExpired();
      return;
    }
    await logout().catch(() => undefined);
    navigate('/login', {
      replace: true,
      state: { message: 'Password added. Sign in again with your email and password.' },
    });
  };

  if (!methods.passwordReady) {
    const provider = methods.reauthProvider;
    const available = provider && (provider !== 'google' || methods.googleAvailable);
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">
          Add a password to sign in with your email as well as your connected provider. First,
          confirm the sign-in method you already use.
        </p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}
        {available ? (
          <button
            type="button"
            disabled={proof.isPending}
            onClick={() => void authenticate()}
            className="rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-45"
          >
            {proof.isPending ? 'Confirming...' : `Confirm with ${PROVIDER_NAMES[provider]}`}
          </button>
        ) : (
          <p className="text-sm text-slate-600">
            Confirming your sign-in is currently unavailable. Please try again later.
          </p>
        )}
      </div>
    );
  }

  const reset = () => {
    setPassword('');
    setConfirm('');
    setError(null);
    mutation.reset();
  };
  const input = (label: string, value: string, change: (value: string) => void) => (
    <label className="block space-y-1.5">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => change(event.target.value)}
        autoComplete="new-password"
        disabled={mutation.isPending}
        required
        className={FIELD}
      />
    </label>
  );

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      {input('New password', password, setPassword)}
      {input('Confirm new password', confirm, setConfirm)}
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="text-sm font-bold text-teal-800 underline decoration-teal-800/30 underline-offset-4"
      >
        {visible ? 'Hide passwords' : 'Show passwords'}
      </button>
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
        Use at least 8 characters with an uppercase letter, number, and special character. Your
        confirmation lasts five minutes. Adding a password signs out every device.
      </p>
      <SaveRow
        pending={mutation.isPending}
        error={error}
        saved={false}
        dirty={dirty}
        label="Add password"
        onReset={reset}
      />
    </form>
  );
}
