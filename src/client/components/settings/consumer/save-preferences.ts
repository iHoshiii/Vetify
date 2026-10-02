import { useUpdatePreferences } from '@/hooks/usePreferences';
import type { UserPreferencesUpdate } from '@shared/schemas';
import { useEffect, useRef, useState } from 'react';

// Shared save plumbing for the settings forms: one mutation, a 3s Saved flag, and an error line. Each form sends only the section it owns.
export function useSavePreferences() {
  const update = useUpdatePreferences();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the pending Saved reset if the form unmounts, so it never sets state after teardown.
  useEffect(() => () => clearTimeout(savedTimer.current ?? undefined), []);

  return {
    pending: update.isPending,
    error,
    saved,
    setError,
    save: (patch: UserPreferencesUpdate) => {
      setError(null);
      setSaved(false);
      update.mutate(patch, {
        onSuccess: () => {
          setSaved(true);
          clearTimeout(savedTimer.current ?? undefined);
          savedTimer.current = setTimeout(() => setSaved(false), 3000);
        },
        onError: (err) => setError(err.message || 'That did not save. Try again.'),
      });
    },
  };
}
