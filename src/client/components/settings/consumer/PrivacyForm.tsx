import type { UserPreferences } from '@shared/schemas';
import { useState } from 'react';

import { useBlockedUsers } from '@/hooks/usePreferences';
import { SaveRow, Toggle } from './controls';
import { useSavePreferences } from './save-preferences';

type Privacy = UserPreferences['privacy'];

export default function PrivacyForm({ privacy }: { privacy: Privacy }) {
  const { pending, error, saved, save } = useSavePreferences();
  const [draft, setDraft] = useState<Privacy>(privacy);
  const { data: blocked = [], isLoading } = useBlockedUsers();

  const unblock = (id: string) =>
    setDraft((d) => ({ ...d, blockedUserIds: d.blockedUserIds.filter((x) => x !== id) }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save({ privacy: draft });
  };

  // Names come from the server; a blocked account it could not resolve (since deleted) simply has no row.
  const rows = blocked.filter((u) => draft.blockedUserIds.includes(u.id));

  return (
    <form onSubmit={submit} className="space-y-4">
      <Toggle
        checked={draft.analyticsOptOut}
        onChange={(v) => setDraft((d) => ({ ...d, analyticsOptOut: v }))}
        label="Opt out of analytics"
        desc="Stop sharing anonymous usage data."
      />

      <div className="space-y-2">
        <span className="block text-sm font-bold text-slate-700">Blocked accounts</span>
        {isLoading && <p className="px-1 text-xs text-slate-500">Loading blocked accounts…</p>}
        {!isLoading && rows.length === 0 && (
          <p className="px-1 text-xs text-slate-500">You have not blocked anyone.</p>
        )}
        {rows.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-700">
                {u.name ?? u.email}
              </span>
              <span className="block truncate text-xs text-slate-500">{u.email}</span>
            </span>
            <button
              type="button"
              onClick={() => unblock(u.id)}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50"
            >
              Unblock
            </button>
          </div>
        ))}
      </div>

      <SaveRow pending={pending} error={error} saved={saved} label="Save privacy" />
    </form>
  );
}
