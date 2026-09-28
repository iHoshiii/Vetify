import { changePassword, updateProfile } from '@/services/account.service';
import type { AccountProfileUpdate, PasswordChange } from '@shared/schemas';
import { useMutation } from '@tanstack/react-query';

import { useAuth } from '@/components/providers/AuthProvider';
import type { AuthUser } from '@/lib/auth';

// Saving a profile change refreshes the session user, so the navbar and tray show the new name at once.
export function useUpdateProfile() {
  const { accessToken, setSession } = useAuth();
  return useMutation<AuthUser, Error, AccountProfileUpdate>({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      if (accessToken) setSession({ accessToken, user });
    },
  });
}

// Nothing to cache; the response only confirms the change.
export function useChangePassword() {
  return useMutation<void, Error, PasswordChange>({ mutationFn: changePassword });
}
