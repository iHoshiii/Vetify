import type { UserPreferences } from '@shared/schemas';
import { useState } from 'react';

import { FIELD, SaveRow, Toggle } from './controls';
import { useSavePreferences } from './save-preferences';
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';

type Notifications = UserPreferences['notifications'];
type CategoryKey = keyof Notifications['categories'];

const CATEGORY_LABEL: Record<CategoryKey, { label: string; desc: string }> = {
  bookings: { label: 'Booking updates', desc: 'Requests, confirmations, and declines.' },
  reminders: { label: 'Reminders', desc: 'Before an appointment starts.' },
  reviews: { label: 'Reviews', desc: 'Requests to rate a visit, and replies.' },
};

export default function NotificationsForm({
  notifications,
  timeZone,
}: {
  notifications: Notifications;
  timeZone: string;
}) {
  const { pending, error, saved, save } = useSavePreferences();
  const [draft, setDraft] = useState<Notifications>(notifications);
  const dirty = JSON.stringify(draft) !== JSON.stringify(notifications);
  useUnsavedGuard(dirty);

  const setCategory = (key: CategoryKey, value: boolean) =>
    setDraft((d) => ({ ...d, categories: { ...d.categories, [key]: value } }));
  const setDnd = (change: Partial<Notifications['dnd']>) =>
    setDraft((d) => ({ ...d, dnd: { ...d.dnd, ...change } }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save({ notifications: draft });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Toggle
        checked={draft.enabled}
        onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
        label="In-app notifications"
        desc="Show booking, reminder, and review updates in Vetify."
      />

      <div className="space-y-2">
        <span className="block text-sm font-bold text-slate-700">Which alerts</span>
        {(Object.keys(CATEGORY_LABEL) as CategoryKey[]).map((key) => (
          <Toggle
            key={key}
            checked={draft.categories[key]}
            onChange={(v) => setCategory(key, v)}
            label={CATEGORY_LABEL[key].label}
            desc={CATEGORY_LABEL[key].desc}
            disabled={!draft.enabled}
          />
        ))}
      </div>

      <div className="space-y-2">
        <Toggle
          checked={draft.dnd.enabled}
          onChange={(v) => setDnd({ enabled: v })}
          label="Do not disturb"
          desc={`Keep notifications in your feed without interrupting you during quiet hours (${timeZone}).`}
          disabled={!draft.enabled}
        />
        {draft.dnd.enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold text-slate-600">
              From
              <input
                type="time"
                value={draft.dnd.start}
                onChange={(e) => setDnd({ start: e.target.value })}
                className={FIELD}
              />
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-600">
              Until
              <input
                type="time"
                value={draft.dnd.end}
                onChange={(e) => setDnd({ end: e.target.value })}
                className={FIELD}
              />
            </label>
          </div>
        )}
      </div>

      <SaveRow
        pending={pending}
        error={error}
        saved={saved && !dirty}
        dirty={dirty}
        label="Save notifications"
        onReset={() => setDraft(notifications)}
      />
    </form>
  );
}
