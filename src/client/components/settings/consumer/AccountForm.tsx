import { Download, LogOut, UserRoundX } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/components/providers/AuthProvider';
import { useDeactivateAccount, useExportAccount } from '@/hooks/useAccount';
import { FIELD } from './controls';

export default function AccountForm() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const exportMutation = useExportAccount();
  const deactivate = useDeactivateAccount();
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');

  const download = async () => {
    const data = await exportMutation.mutateAsync().catch(() => null);
    if (!data) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `vetify-account-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const runDeactivate = async () => {
    const completed = await deactivate
      .mutateAsync({
        confirmation: 'DEACTIVATE',
        currentPassword: password || undefined,
      })
      .then(() => true)
      .catch(() => false);
    if (!completed) return;
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="block text-sm font-black text-slate-900">Download account data</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Export your profile and saved settings as JSON.
          </span>
        </span>
        <button
          type="button"
          disabled={exportMutation.isPending}
          onClick={() => void download()}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exportMutation.isPending ? 'Preparing…' : 'Download'}
        </button>
      </div>
      <button
        type="button"
        onClick={() => void logout().then(() => navigate('/', { replace: true }))}
        className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-rose-900">
          <UserRoundX className="h-4 w-4" />
          Deactivate account
        </h3>
        <p className="mt-1 text-xs leading-5 text-rose-800">
          Blocks sign-in while preserving appointments and records. Contact support to restore the
          account.
        </p>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100"
          >
            Deactivate account
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-rose-900">Type DEACTIVATE to confirm</span>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className={FIELD}
              />
            </label>
            {user?.provider === 'local' && (
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-rose-900">Current password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className={FIELD}
                />
              </label>
            )}
            {deactivate.error && (
              <p aria-live="polite" className="text-sm font-semibold text-rose-700">
                {deactivate.error.message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setConfirmation('');
                  setPassword('');
                }}
                className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  confirmation !== 'DEACTIVATE' ||
                  deactivate.isPending ||
                  (user?.provider === 'local' && !password)
                }
                onClick={() => void runDeactivate()}
                className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {deactivate.isPending ? 'Deactivating…' : 'Confirm deactivation'}
              </button>
            </div>
          </div>
        )}
      </div>
      {exportMutation.error && (
        <p aria-live="polite" className="text-sm font-semibold text-rose-700">
          {exportMutation.error.message}
        </p>
      )}
    </div>
  );
}
