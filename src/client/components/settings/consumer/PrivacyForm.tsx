import { useBlockedUsers, useUnblockUser } from '@/hooks/usePreferences';

export default function PrivacyForm() {
  const { data: blocked = [], isLoading, isError, refetch } = useBlockedUsers();
  const unblock = useUnblockUser();

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <p className="text-sm leading-6 text-emerald-900">
          Vetify does not currently load a third-party analytics tracker, so there is no analytics
          consent switch to manage.
        </p>
      </div>
      <div>
        <h3 className="text-sm font-black text-slate-900">Blocked accounts</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Blocked people cannot start or continue a conversation with you. Appointment history
          remains available.
        </p>
      </div>
      {isLoading && <div className="h-16 animate-pulse rounded-xl bg-slate-100" />}
      {isError && (
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
        >
          Retry blocked accounts
        </button>
      )}
      {!isLoading && !isError && blocked.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
          <p className="text-sm font-bold text-slate-700">No blocked accounts</p>
          <p className="mt-1 text-xs text-slate-500">
            You can block someone from a conversation’s options menu.
          </p>
        </div>
      )}
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {blocked.map((user) => (
          <li key={user.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-800">
                {user.name ?? user.email}
              </span>
              <span className="block truncate text-xs text-slate-500">{user.email}</span>
            </span>
            <button
              type="button"
              disabled={unblock.isPending}
              onClick={() => {
                if (window.confirm(`Unblock ${user.name ?? user.email}?`)) unblock.mutate(user.id);
              }}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Unblock
            </button>
          </li>
        ))}
      </ul>
      {unblock.error && (
        <p aria-live="polite" className="text-sm font-semibold text-rose-700">
          {unblock.error.message}
        </p>
      )}
    </div>
  );
}
