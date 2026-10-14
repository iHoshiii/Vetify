import { ADMIN_PAGE_SIZE } from '@shared/limits';
import type { AdminUserSort } from '@shared/schemas';
import { ObjectId, type Filter, type Sort } from 'mongodb';
import { toObjectId } from '../object-id';
import { escapeRegex } from '../text-search';
import { usersCollection } from './repository';
import type { AuthProvider, User, UserDocument, UserRole, UserStatus } from './types';
const WITHOUT_PASSWORD = { password: 0, passwordReset: 0 } as const;

export function countActiveAdmins(): Promise<number> {
  return usersCollection().countDocuments({ role: 'admin', status: 'active' });
}

export function findUsersByIds(ids: Array<string | ObjectId>): Promise<User[]> {
  if (ids.length === 0) return Promise.resolve([]);

  return usersCollection()
    .find<User>({ _id: { $in: ids.map(toObjectId) } }, { projection: WITHOUT_PASSWORD })
    .toArray();
}

export type FindUsersOptions = {
  q?: string;
  role?: UserRole;
  status?: UserStatus;
  provider?: AuthProvider;
  sort?: AdminUserSort;
  page?: number;
  limit?: number;
  days?: 7 | 30 | 90;
};

const USER_SORTS: Record<AdminUserSort, Sort> = {
  // The default, and the one the `{ role: 1, createdAt: -1 }` index serves.
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  email: { email: 1 },
};

export async function findUsersPaginated(
  options: FindUsersOptions = {}
): Promise<{ items: User[]; total: number }> {
  const {
    q,
    role,
    status,
    provider,
    sort = 'newest',
    page = 1,
    limit = ADMIN_PAGE_SIZE,
    days,
  } = options;

  const filter: Filter<UserDocument> = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (provider) filter.provider = provider;
  if (days) filter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };

  const term = q?.trim();
  if (term) {
    const escaped = escapeRegex(term);
    filter.$or = [
      { email: { $regex: `^${escaped.toLowerCase()}` } },
      { name: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    usersCollection()
      .find<User>(filter, { projection: WITHOUT_PASSWORD })
      .sort(USER_SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    usersCollection().countDocuments(filter),
  ]);

  return { items, total };
}

export async function countUsersBy(
  field: 'role' | 'status' | 'provider',
  where: { role?: UserRole } = {}
): Promise<Record<string, number>> {
  const rows = await usersCollection()
    .aggregate<{ _id: string | null; count: number }>([
      // Narrowing to one role is what turns "accounts by status" into "users by
      // status", which is the count that belongs beside a list of one role. The
      // { role: 1 } index serves the match.
      ...(where.role ? [{ $match: { role: where.role } }] : []),
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ])
    .toArray();

  // A null bucket is a document written before the field existed; the backfill
  // script clears those, and until it runs they are counted as the default.
  return Object.fromEntries(rows.map((row) => [row._id ?? 'unknown', row.count]));
}
