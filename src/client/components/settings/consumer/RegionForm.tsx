import type { UserPreferences } from '@shared/schemas';
import { USER_TIME_ZONES } from '@shared/schemas';
import { useState } from 'react';

import { useUnsavedGuard } from '@/hooks/useUnsavedGuard';
import { FIELD, SaveRow } from './controls';
import { useSavePreferences } from './save-preferences';

const formatter = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' });

function labelOf(timeZone: string): string {
  const zone = formatter
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value;
  return `${timeZone.replaceAll('_', ' ')}${zone ? ` (${zone})` : ''}`;
}

export default function RegionForm({ region }: { region: UserPreferences['region'] }) {
  const { pending, error, saved, save } = useSavePreferences();
  const [timeZone, setTimeZone] = useState(region.timeZone);
  const dirty = timeZone !== region.timeZone;
  useUnsavedGuard(dirty);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save({ region: { timeZone } });
      }}
      className="space-y-5"
    >
      <label className="block space-y-1.5">
        <span className="text-sm font-bold text-slate-700">Timezone</span>
        <select
          value={timeZone}
          onChange={(event) => setTimeZone(event.target.value as typeof timeZone)}
          className={FIELD}
        >
          {USER_TIME_ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {labelOf(zone)}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="block text-sm font-bold text-slate-800">Display language</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          English is currently the only fully translated interface language.
        </span>
      </div>
      <SaveRow
        pending={pending}
        error={error}
        saved={saved && !dirty}
        dirty={dirty}
        label="Save region"
        onReset={() => setTimeZone(region.timeZone)}
      />
    </form>
  );
}
