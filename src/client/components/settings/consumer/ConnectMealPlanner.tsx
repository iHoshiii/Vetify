import { QRCodeSVG } from 'qrcode.react';
import { NATIVE_HANDOFF_SECONDS } from '@shared/native-auth';
import { useAuth } from '@/components/providers/AuthProvider';
import Button from '@/components/ui/Button';
import { useNativeHandoff } from '@/hooks/useNativeHandoff';

export default function ConnectMealPlanner() {
  const { user } = useAuth();
  const connection = useNativeHandoff(user?.id);
  const generated = Boolean(connection.url) || connection.expired;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-teal-800">
          Account to connect
        </p>
        <p className="mt-1 font-bold text-slate-950">{user?.name || 'Your Vetify account'}</p>
        <p className="text-sm text-slate-600">{user?.email}</p>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
        <li>Install the Vetify Meal Planner app on your phone first.</li>
        <li>Generate a connection QR below, then scan it with your phone.</li>
        <li>The installed app opens and connects to the account shown above.</li>
      </ol>
      <p className="text-sm text-slate-600">
        You stay signed in on this computer. Your phone does not need another password. This account
        QR is separate from the app download QR or Google Drive installation link.
      </p>

      {connection.url && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 p-5">
          <QRCodeSVG
            value={connection.url}
            size={240}
            marginSize={4}
            level="M"
            role="img"
            aria-label="Connect your Vetify account to Meal Planner"
            className="h-auto max-w-full"
          />
          <p role="status" className="text-sm font-semibold text-slate-800">
            Expires in {connection.remaining} seconds.
          </p>
          <p className="max-w-sm text-center text-xs leading-5 text-slate-500">
            Keep this personal QR private. It connects your account once and expires after{' '}
            {NATIVE_HANDOFF_SECONDS} seconds.
          </p>
        </div>
      )}
      {connection.expired && (
        <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          This QR has expired. Generate a new connection QR to try again.
        </p>
      )}
      {connection.error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          {connection.error}
        </p>
      )}
      <Button
        type="button"
        loading={connection.pending}
        disabled={!user}
        onClick={() => void connection.generate()}
      >
        {connection.pending
          ? 'Creating connection QR...'
          : generated
          ? 'Generate a new QR'
          : 'Generate connection QR'}
      </Button>
    </div>
  );
}
