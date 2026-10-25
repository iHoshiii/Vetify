import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  addAccountPassword,
  getAccountLoginMethods,
  reauthenticateAccount,
} from '@/services/account-auth.service';

export function useAccountLoginMethods() {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: ['account-login-methods', user?.id ?? 'anonymous'],
    queryFn: ({ signal }) => getAccountLoginMethods(signal),
    enabled: Boolean(user) && status === 'authenticated',
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function useReauthenticateAccount() {
  return useMutation({ mutationFn: reauthenticateAccount });
}

export function useAddAccountPassword() {
  return useMutation({ mutationFn: addAccountPassword });
}
