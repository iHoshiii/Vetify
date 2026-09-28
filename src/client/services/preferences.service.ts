import type { UserPreferences, UserPreferencesUpdate } from '@shared/schemas';

import { apiFetch } from './api';

// GET /api/v1/account/preferences — the caller's notification and privacy settings.
export async function getPreferences(signal?: AbortSignal): Promise<UserPreferences> {
  const { preferences } = await apiFetch<{ preferences: UserPreferences }>('/account/preferences', {
    signal,
  });
  return preferences;
}

// PATCH /api/v1/account/preferences — replace one or both sections, returning the whole settings.
export async function updatePreferences(patch: UserPreferencesUpdate): Promise<UserPreferences> {
  const { preferences } = await apiFetch<{ preferences: UserPreferences }>('/account/preferences', {
    method: 'PATCH',
    body: patch,
  });
  return preferences;
}
