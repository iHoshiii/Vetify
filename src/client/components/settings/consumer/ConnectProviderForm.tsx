import { useEffect, useState, type FormEvent } from 'react';
import { connectProviderSchema } from '@shared/account-auth';
import { useConnectAccountProvider } from '@/hooks/useAccountLoginMethods';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { openAccountAuthUrl } from '@/services/account-auth.service';
import { accountAuthError, PROVIDER_NAMES } from './account-auth-feedback';
import { FIELD, SaveRow } from './controls';

export default function ConnectProviderForm({ provider }: { provider: 'google' | 'facebook' }) {
  const name = PROVIDER_NAMES[provider];
  const mutation = useConnectAccountProvider();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  useUnsavedGuard(Boolean(password) && !destination);

  useEffect(() => {
    if (!destination) return;
    try {
      openAccountAuthUrl(destination);
    } catch (cause) {
      setError(accountAuthError(cause, `We could not open ${name} sign-in. Please try again.`));
      setDestination(null);
    }
  }, [destination, name]);

  const reset = () => {
    setPassword('');
    setError(null);
    mutation.reset();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = connectProviderSchema.safeParse({ currentPassword: password });
    if (!parsed.success)
      return setError(parsed.error.issues[0]?.message ?? 'Enter your current password.');
    setError(null);
    try {
      const { url } = await mutation.mutateAsync({
        provider,
        currentPassword: parsed.data.currentPassword,
      });
      setPassword('');
      setDestination(url);
    } catch (cause) {
      setError(accountAuthError(cause, `We could not connect ${name}. Please try again.`));
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">
        Confirm your current password, then choose a {name} account with the same verified email.
      </p>
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-700">Password to connect {name}</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          disabled={mutation.isPending || Boolean(destination)}
          className={FIELD}
        />
      </label>
      <SaveRow
        pending={mutation.isPending || Boolean(destination)}
        error={error}
        saved={false}
        dirty={Boolean(password)}
        label={`Connect ${name}`}
        onReset={reset}
      />
    </form>
  );
}
