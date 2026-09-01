import type { UserRole } from '@shared/schemas';

const PILL = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold';

/**
 * Colour by what the role can do, not by taste: an admin can act on every other
 * account, so it reads as the loud one.
 */
const TONE: Record<UserRole, string> = {
  admin: 'bg-forest-800 text-white',
  professional: 'bg-forest-100 text-forest-900',
  user: 'bg-slate-100 text-slate-700',
};

const LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  professional: 'Professional',
  user: 'User',
};

/** What an account may do, as a pill. */
export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={`${PILL} ${TONE[role]}`}>{LABEL[role]}</span>;
}
