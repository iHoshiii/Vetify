import {
  blockUser,
  getBlockedUsers,
  getPreferences,
  unblockUser,
  updatePreferences,
} from '@/services/preferences.service';
import type { UserPreferences, UserPreferencesUpdate } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';

// Account id prevents one signed-out account's cached preferences appearing for the next sign-in.
export const preferenceKeys = {
  root: ['preferences'] as const,
  all: (userId: string) => ['preferences', userId] as const,
  blocked: (userId: string) => ['preferences', userId, 'blocked'] as const,
};

const STALE_TIME = 60_000;

// The caller's own settings. PreferenceSync reads them after sign-in so timezone formatting stays consistent across the app.
export function usePreferences(enabled = true) {
  const { user } = useAuth();
  return useQuery<UserPreferences>({
    queryKey: preferenceKeys.all(user?.id ?? 'anonymous'),
    queryFn: ({ signal }) => getPreferences(signal),
    enabled: enabled && Boolean(user),
    staleTime: STALE_TIME,
  });
}

// Writes a section and seeds the cache with the returned whole, so the page reflects the save without a refetch.
export function useUpdatePreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation<UserPreferences, Error, UserPreferencesUpdate>({
    mutationFn: updatePreferences,
    onSuccess: (updated) =>
      queryClient.setQueryData(preferenceKeys.all(user?.id ?? 'anonymous'), updated),
  });
}

// Names for the blocked list, fetched only while the privacy section is open.
export function useBlockedUsers(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: preferenceKeys.blocked(user?.id ?? 'anonymous'),
    queryFn: ({ signal }) => getBlockedUsers(signal),
    enabled: enabled && Boolean(user),
    staleTime: STALE_TIME,
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: blockUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preferenceKeys.root });
      void queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: unblockUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: preferenceKeys.root });
    },
  });
}
