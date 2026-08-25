import {
  getAdminUser,
  listAdminUsers,
  updateUserRole,
  updateUserStatus,
  type AdminPage,
  type AdminUser,
  type AdminUserListParams,
  type RoleChangeResult,
  type StatusChangeResult,
} from '@/services/admin.service';
import type { UserRole, UserStatus } from '@shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ADMIN_STALE_TIME, adminKeys, invalidateAdmin, retryUnlessRefused } from './admin-keys';

/** One page of accounts, filtered and sorted by whatever the toolbar holds. */
export function useAdminUsers(params: AdminUserListParams = {}) {
  return useQuery<AdminPage<AdminUser>>({
    queryKey: adminKeys.userList(params),
    queryFn: ({ signal }) => listAdminUsers(params, signal),
    staleTime: ADMIN_STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

/** One account. Disabled until there is an id to ask for. */
export function useAdminUser(id: string | undefined) {
  return useQuery<AdminUser>({
    queryKey: adminKeys.user(id ?? ''),
    queryFn: ({ signal }) => getAdminUser(id as string, signal),
    enabled: Boolean(id),
    staleTime: ADMIN_STALE_TIME,
    retry: retryUnlessRefused,
  });
}

/**
 * Promote or demote.
 *
 * The reply is the account after the change, written straight into its detail
 * cache so the badge on screen is the server's answer rather than an optimistic
 * guess — which matters here, because the server can refuse: demoting the last
 * admin, or your own account, comes back 409 and the badge must not have moved.
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation<RoleChangeResult, Error, { id: string; role: UserRole; reason?: string }>({
    mutationFn: updateUserRole,
    onSuccess: (result) => {
      queryClient.setQueryData(adminKeys.user(result.user.id), result.user);
      invalidateAdmin(queryClient, adminKeys.users());
    },
  });
}

/**
 * Suspend, ban, or reinstate.
 *
 * Also invalidates the applications family: a banned account's application is
 * still in the queue, and a reviewer looking at it should see who they are dealing
 * with rather than a row that looks ordinary.
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    StatusChangeResult,
    Error,
    { id: string; status: UserStatus; reason?: string }
  >({
    mutationFn: updateUserStatus,
    onSuccess: (result) => {
      queryClient.setQueryData(adminKeys.user(result.user.id), result.user);
      invalidateAdmin(queryClient, adminKeys.users());
      void queryClient.invalidateQueries({ queryKey: adminKeys.professionals() });
    },
  });
}
