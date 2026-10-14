import { useState } from 'react';
import {
  ACCOUNT_LINK_METHODS,
  type AccountLinkMethod,
  type AccountLoginMethods,
} from '@shared/account-auth';
import { useAuth } from '@/components/providers/AuthProvider';
import { LOGIN_METHOD_NAMES } from './account-auth-feedback';
import LinkMethodCodeForm from './LinkMethodCodeForm';
import AddPasswordForm from './AddPasswordForm';

export default function ConnectedLogins({
  methods,
  onRefresh,
}: {
  methods: AccountLoginMethods;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<AccountLinkMethod | null>(
    methods.passwordReady ? 'local' : null
  );
  const [passwordReady, setPasswordReady] = useState(methods.passwordReady);
  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-slate-600">
        Link another sign-in method to use the same Vetify account. Each link requires email
        verification.
      </p>
      {ACCOUNT_LINK_METHODS.map((method) => {
        const linked =
          method === 'local' ? methods.hasPassword : methods.providers.includes(method);
        const available = method === 'local' || methods.availableProviders.includes(method);
        return (
          <div key={method} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-bold text-slate-900">{LOGIN_METHOD_NAMES[method]}</span>
              {linked ? (
                <span className="text-sm font-bold text-emerald-700">Linked</span>
              ) : (
                <button
                  type="button"
                  aria-label={`Link ${LOGIN_METHOD_NAMES[method]}`}
                  disabled={!available || selected !== null}
                  onClick={() => {
                    setSelected(method);
                    setPasswordReady(false);
                  }}
                  className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-45"
                >
                  Link
                </button>
              )}
            </div>
            {!linked && !available && (
              <p className="text-sm text-slate-500">
                {method === 'tiktok' && methods.tiktokHttpsReady === false
                  ? 'TikTok linking will be available when Vetify uses HTTPS.'
                  : `${LOGIN_METHOD_NAMES[method]} sign-in is currently unavailable.`}
              </p>
            )}
            {selected === method &&
              !linked &&
              (method === 'local' && passwordReady ? (
                <div className="space-y-3">
                  <AddPasswordForm
                    methods={{ ...methods, passwordReady: true }}
                    onProofExpired={() => {
                      setPasswordReady(false);
                      onRefresh();
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setPasswordReady(false);
                    }}
                    className="text-sm font-semibold text-slate-600"
                  >
                    Cancel linking
                  </button>
                </div>
              ) : (
                <LinkMethodCodeForm
                  method={method}
                  email={user?.email ?? ''}
                  onClose={() => setSelected(null)}
                  onVerified={() => {
                    setPasswordReady(true);
                    onRefresh();
                  }}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
