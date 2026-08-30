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
  // The public map, and the only index $geoNear can rank on.
  //
  // Only *published* pins are in here, because `mapPoint` exists only while an address
  // is published. That matters more than it looks: on an array field $geoNear reports
  // the distance to the nearest indexed element, so a vet who published their clinic
  // and hid their home would have been ranked by their house had both been indexed.
  // A 2dsphere index skips a *missing* field, which is what makes presence sufficient
  // here. Not a null one: an explicit null beside a real point in the same array is a
  // value the index tries to read as a shape and refuses the whole write over, which is
  // why hiding an address unsets the field. Both halves are asserted in a test.
  { key: { 'addresses.mapPoint': '2dsphere' } },
];
