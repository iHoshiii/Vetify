import { pick, useAdminListParams } from '@/hooks/useAdminListParams';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { USER_ROLES, type UserRole } from '@shared/schemas';

import { AccountsTable } from '../_components/accounts-table';

/** What a role is called in the console, not on the wire: 'user' is the role,
 * "Public users" is the tab. */
const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Public users',
  professional: 'Professionals',
  admin: 'Admins',
};

/**
 * One tab of accounts: the list of them, at one role or at all of them.
 *
 * `role` is what the tab is about, and undefined means every account — the landing
 * tab. The rail above offers the roles as links rather than as a dropdown, so the
 * tab that is open is the whole answer to which accounts these are, and there is no
 * Role filter left to contradict it.
 *
 * The figures that used to sit above this list are in Statistics now, where every
 * platform number is read together. This page is for finding one person.
 */
export default function AccountsTab({ role }: { role?: UserRole }) {
  const { get } = useAdminListParams();

  // The role this tab is for, or one a ?role= link arrived with.
  const shown = role ?? pick(get('role'), USER_ROLES);

  useDocumentTitle(
    `Admin ${shown ? ROLE_LABEL[shown].toLowerCase() : 'accounts'}`,
    'Accounts, roles and access.'
  );

  return (
    <div className="space-y-6">
      <AccountsTable role={shown} roleFilter={false} />
    </div>
  );
}
