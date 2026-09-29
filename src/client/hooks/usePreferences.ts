import {
  blockUser,
  getBlockedUsers,
  getPreferences,
  unblockUser,
  updatePreferences,
} from '@/services/preferences.service';
import type { UserPreferences, UserPreferencesUpdate } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// One row per account, so a single key holds the whole thing.
export const preferenceKeys = {
  all: ['preferences'] as const,
  blocked: ['preferences', 'blocked'] as const,
};

const STALE_TIME = 60_000;

// The caller's own settings. Disabled until the settings page mounts, since nothing else reads them.
export function usePreferences(enabled = true) {
  return useQuery<UserPreferences>({
    queryKey: preferenceKeys.all,
    queryFn: ({ signal }) => getPreferences(signal),
    enabled,
    staleTime: STALE_TIME,
  });
}

// Writes a section and seeds the cache with the returned whole, so the page reflects the save without a refetch.
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation<UserPreferences, Error, UserPreferencesUpdate>({
    mutationFn: updatePreferences,
    onSuccess: (updated) => queryClient.setQueryData(preferenceKeys.all, updated),
  });
}

// Names for the blocked list, fetched only while the privacy section is open.
export function useBlockedUsers(enabled = true) {
  return useQuery({
    queryKey: preferenceKeys.blocked,
    queryFn: ({ signal }) => getBlockedUsers(signal),
    enabled,
    staleTime: STALE_TIME,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: blockUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preferenceKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: unblockUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preferenceKeys.all });
      void queryClient.invalidateQueries({ queryKey: preferenceKeys.blocked });
    },
  });
}
