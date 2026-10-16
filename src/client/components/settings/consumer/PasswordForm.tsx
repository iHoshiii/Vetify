import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccountLoginMethods } from '@/hooks/useAccountLoginMethods';
import { ACCOUNT_AUTH_MESSAGES, PROVIDER_NAMES } from './account-auth-feedback';
import ChangePasswordForm from './ChangePasswordForm';
import ConnectedLogins from './ConnectedLogins';

type Notice = { connection: string | null; auth: string | null; error: string | null };
const readNotice = (params: URLSearchParams): Notice => ({
  connection: params.get('connection'),
  auth: params.get('auth'),
  error: params.get('accountAuthError'),
});

export default function PasswordForm() {
  const methods = useAccountLoginMethods();
  const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState(() => readNotice(params));

  useEffect(() => {
    if (!params.has('connection') && !params.has('auth') && !params.has('accountAuthError')) return;
    setNotice(readNotice(params));
    const clean = new URLSearchParams(params);
    ['connection', 'auth', 'accountAuthError'].forEach((key) => clean.delete(key));
    setParams(clean, { replace: true });
  }, [params, setParams]);

  if (methods.isLoading)
    return (
      <p role="status" className="text-sm text-slate-600">
        Loading sign-in methods...
      </p>
    );
  if (methods.isError || !methods.data) {
    return (
      <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
        <p role="alert" className="text-sm font-semibold text-rose-800">
          Your sign-in methods did not load.
        </p>
        <button
          type="button"
          onClick={() => void methods.refetch()}
          className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-rose-700 ring-1 ring-rose-200"
        >
          Try again
        </button>
      </div>
    );
  }

  const error = notice.error
    ? ACCOUNT_AUTH_MESSAGES[notice.error] ?? ACCOUNT_AUTH_MESSAGES.provider
    : '';
  const linked = methods.data.providers.find(
    (provider) => notice.connection === `${provider}-linked`
  );
  const success = linked
    ? `${PROVIDER_NAMES[linked]} sign-in is linked to your existing Vetify account.`
    : notice.auth === 'password-ready' && methods.data.passwordReady
    ? 'Sign-in confirmed. You can now add a password.'
    : '';

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-700 bg-white px-4 py-3 text-sm text-emerald-800"
        >
          {success}
        </p>
      )}
      <section aria-labelledby="connected-logins-heading" className="space-y-4">
        <h3 id="connected-logins-heading" className="text-base font-bold text-slate-900">
          Connected sign-in methods
        </h3>
        <ConnectedLogins methods={methods.data} onRefresh={() => void methods.refetch()} />
      </section>
      {methods.data.hasPassword && (
        <section
          aria-labelledby="account-password-heading"
          className="space-y-4 border-t border-slate-200 pt-6"
        >
          <h3 id="account-password-heading" className="text-base font-bold text-slate-900">
            Password
          </h3>
          <ChangePasswordForm />
        </section>
      )}
    </div>
  );
}
