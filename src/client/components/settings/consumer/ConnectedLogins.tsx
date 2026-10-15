import { useState } from 'react';
import {
  ACCOUNT_LINK_METHODS,
  type AccountLinkMethod,
  type AccountLoginMethods,
} from '@shared/account-auth';
import { useAuth } from '@/components/providers/AuthProvider';
import { LOGIN_METHOD_NAMES } from './account-auth-feedback';
import LinkMethodDialog from './LinkMethodDialog';
import { LINK_METHOD_BUTTON } from './link-method-styles';

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
  const selectedLinked =
    selected === 'local'
      ? methods.hasPassword
      : selected !== null && methods.providers.includes(selected);
  const close = () => {
    setSelected(null);
    setPasswordReady(false);
  };
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
                  disabled={!available}
                  onClick={() => {
                    setSelected(method);
                    setPasswordReady(false);
                  }}
                  className={LINK_METHOD_BUTTON}
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
          </div>
        );
      })}
      {selected && !selectedLinked && (
        <LinkMethodDialog
          method={selected}
          methods={methods}
          email={user?.email ?? ''}
          passwordReady={passwordReady}
          onClose={close}
          onVerified={() => {
            setPasswordReady(true);
            onRefresh();
          }}
          onProofExpired={() => {
            setPasswordReady(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
