import type { UserPreferences } from '@shared/schemas';
import { useState } from 'react';

import { SaveRow, Toggle } from './controls';
import { useSavePreferences } from './save-preferences';

type Notifications = UserPreferences['notifications'];
type CategoryKey = keyof Notifications['categories'];

const CATEGORY_LABEL: Record<CategoryKey, { label: string; desc: string }> = {
  bookings: { label: 'Booking updates', desc: 'Requests, confirmations, and declines.' },
  reminders: { label: 'Reminders', desc: 'Before an appointment starts.' },
  reviews: { label: 'Reviews', desc: 'Requests to rate a visit, and replies.' },
};

const TIME_FIELD =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700';

export default function NotificationsForm({ notifications }: { notifications: Notifications }) {
  const { pending, error, saved, save } = useSavePreferences();
  const [draft, setDraft] = useState<Notifications>(notifications);

  const setCategory = (key: CategoryKey, value: boolean) =>
    setDraft((d) => ({ ...d, categories: { ...d.categories, [key]: value } }));
  const setDnd = (change: Partial<Notifications['dnd']>) =>
    setDraft((d) => ({ ...d, dnd: { ...d.dnd, ...change } }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save({ notifications: draft });
  };

  // Categories and quiet hours are moot with the master switch off, so they read as disabled until it is on.
  const dependent = draft.enabled ? '' : 'pointer-events-none opacity-50';

  return (
    <form onSubmit={submit} className="space-y-4">
      <Toggle
        checked={draft.enabled}
        onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
        label="Push alerts"
        desc="Turn every notification on or off."
      />

      <div className={`space-y-2 ${dependent}`}>
        <span className="block text-sm font-bold text-slate-700">Which alerts</span>
        {(Object.keys(CATEGORY_LABEL) as CategoryKey[]).map((key) => (
          <Toggle
            key={key}
            checked={draft.categories[key]}
            onChange={(v) => setCategory(key, v)}
            label={CATEGORY_LABEL[key].label}
            desc={CATEGORY_LABEL[key].desc}
          />
        ))}
      </div>

      <div className={`space-y-2 ${dependent}`}>
        <Toggle
          checked={draft.dnd.enabled}
          onChange={(v) => setDnd({ enabled: v })}
          label="Do not disturb"
          desc="Hold alerts during quiet hours (Manila time)."
        />
        {draft.dnd.enabled && (
          <div className="flex items-center gap-2 px-1">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              From
              <input
                type="time"
                value={draft.dnd.start}
                onChange={(e) => setDnd({ start: e.target.value })}
                className={TIME_FIELD}
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
              to
              <input
                type="time"
                value={draft.dnd.end}
                onChange={(e) => setDnd({ end: e.target.value })}
                className={TIME_FIELD}
              />
            </label>
          </div>
        )}
      </div>

      <SaveRow pending={pending} error={error} saved={saved} label="Save notifications" />
    </form>
  );
}
