import type {
  AccountDeactivation,
  AccountProfileUpdate,
  PasswordChange,
  UserPreferences,
} from '@shared/schemas';

import type { AuthUser } from '@/lib/auth';
import { apiFetch } from './api';

// PATCH /api/v1/account/profile — edit the caller's name and avatar, returning the refreshed account.
export async function updateProfile(patch: AccountProfileUpdate): Promise<AuthUser> {
  const { user } = await apiFetch<{ user: AuthUser }>('/account/profile', {
    method: 'PATCH',
    body: patch,
  });
  return user;
}

// POST /api/v1/account/password — change the password after proving the current one.
export async function changePassword(body: PasswordChange): Promise<void> {
  await apiFetch<{ changed: boolean }>('/account/password', { method: 'POST', body });
}

export type AccountExport = {
  exportedAt: string;
  account: AuthUser;
  preferences: UserPreferences;
};

export async function exportAccount(): Promise<AccountExport> {
  return await apiFetch<AccountExport>('/account/export');
}

export async function deactivateAccount(body: AccountDeactivation): Promise<void> {
  await apiFetch('/account/deactivate', { method: 'POST', body });
}
