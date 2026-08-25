import type { IndexDescription } from 'mongodb';

export const PROFESSIONALS_COLLECTION = 'professionals';

export const PROFESSIONAL_INDEXES: IndexDescription[] = [
  // One application per account. Enforced by the database rather than by a
  // read-then-write in the route, which would still let two submits land at
  // once and leave a reviewer with the same person twice.
  { key: { user: 1 }, unique: true },
  // The review queue: pending applications, in the order they arrived.
  { key: { status: 1, createdAt: -1 } },
  // The public directory: verified vets, most recently verified first. Separate
  // from the queue index because it sorts on a different date, and the sort runs
  // before the account join so this index can serve it.
  { key: { status: 1, reviewedAt: -1 } },
  // A licence belongs to one person, but only within the body that issued it —
  // two national registries can hand out the same number to different vets, so
  // uniqueness is on the pair. Not sparse: both fields are required, and a
  // sparse clause on a field that is always present only reads as if something
  // subtle were happening.
  { key: { licenseAuthority: 1, licenseNumber: 1 }, unique: true },
  // Multikey, for the directory's specialty filter.
  { key: { specialties: 1 } },
];
