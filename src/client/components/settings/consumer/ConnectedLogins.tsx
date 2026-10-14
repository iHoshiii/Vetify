import type { AccountLoginMethods } from '@shared/account-auth';
import { PROVIDER_NAMES } from './account-auth-feedback';
import ConnectProviderForm from './ConnectProviderForm';

export default function ConnectedLogins({ methods }: { methods: AccountLoginMethods }) {
  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {methods.hasPassword && (
          <li className="flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-800">Email and password</span>
            <span className="font-bold text-emerald-700">Enabled</span>
          </li>
        )}
        {methods.providers.map((provider) => (
          <li
            key={provider}
            className="flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"
          >
            <span className="font-semibold text-slate-800">{PROVIDER_NAMES[provider]}</span>
            <span className="font-bold text-emerald-700">Connected</span>
          </li>
        ))}
      </ul>
      {(['google', 'facebook'] as const)
        .filter((provider) => !methods.providers.includes(provider))
        .map((provider) => (
          <div key={provider} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-bold text-slate-900">Connect {PROVIDER_NAMES[provider]}</p>
            {!methods.availableProviders.includes(provider) ? (
              <p className="text-sm text-slate-600">
                {PROVIDER_NAMES[provider]} sign-in is currently unavailable. Please try again later.
              </p>
            ) : !methods.hasPassword ? (
              <p className="text-sm text-slate-600">
                Add a password below before connecting {PROVIDER_NAMES[provider]}.
              </p>
            ) : (
              <ConnectProviderForm provider={provider} />
            )}
          </div>
        ))}
    </div>
  );
}
