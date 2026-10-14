export { appointmentsCollection } from './collection';
export { insertAppointment } from './insert';
export * from './reads';
export * from './tally';
export * from './writes';
export * from './scanners';
export * from './attendance';
export * from './rating-writes';

export function isDuplicateSlot(err: unknown): boolean {
  const detail = err as { code?: number; keyPattern?: Record<string, unknown> } | null;
  return detail?.code === 11000 && detail.keyPattern?.heldSlots !== undefined;
}
