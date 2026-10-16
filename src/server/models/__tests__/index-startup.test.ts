import { beforeEach, expect, it, vi } from 'vitest';
import { ensureIndexes } from '../indexes';
import { ensureIndex } from '../index-maintenance';

vi.mock('../../config/db', () => ({ getDb: () => ({}) }));
vi.mock('../index-maintenance', () => ({ ensureIndex: vi.fn() }));
vi.mock('../index-plan', () => ({
  INDEX_PLAN: Array.from({ length: 6 }, (_, id) => ({
    collection: `collection-${id}`,
    indexes: [{ key: { first: 1 } }, { key: { second: 1 } }],
  })),
}));

beforeEach(() => vi.resetAllMocks());

it('checks four collections concurrently while preserving each collection index order', async () => {
  const finish: Array<() => void> = [];
  vi.mocked(ensureIndex).mockImplementation(
    () => new Promise<void>((resolve) => finish.push(resolve))
  );
  const startup = ensureIndexes();
  expect(ensureIndex).toHaveBeenCalledTimes(4);
  expect(vi.mocked(ensureIndex).mock.calls.map((call) => call[1])).toEqual([
    'collection-0',
    'collection-1',
    'collection-2',
    'collection-3',
  ]);
  finish.splice(0).forEach((resolve) => resolve());
  await vi.waitFor(() => expect(ensureIndex).toHaveBeenCalledTimes(8));
  expect(
    vi
      .mocked(ensureIndex)
      .mock.calls.slice(4)
      .every((call) => 'second' in call[2].key)
  ).toBe(true);
  finish.splice(0).forEach((resolve) => resolve());
  await vi.waitFor(() => expect(ensureIndex).toHaveBeenCalledTimes(10));
  finish.splice(0).forEach((resolve) => resolve());
  await vi.waitFor(() => expect(ensureIndex).toHaveBeenCalledTimes(12));
  finish.splice(0).forEach((resolve) => resolve());
  await startup;
});

it('waits for the active batch before reporting a failure and skips later collections', async () => {
  let finish!: () => void;
  const failure = new Error('Index unavailable');
  vi.mocked(ensureIndex).mockImplementation(async (_db, collection) => {
    if (collection === 'collection-0') throw failure;
    if (collection === 'collection-1')
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
  });
  let settled = false;
  const startup = ensureIndexes().catch((error) => {
    settled = true;
    return error;
  });
  await vi.waitFor(() => expect(ensureIndex).toHaveBeenCalledTimes(6));
  expect(settled).toBe(false);
  finish();
  await vi.waitFor(() => expect(ensureIndex).toHaveBeenCalledTimes(7));
  finish();
  expect(await startup).toBe(failure);
  expect(vi.mocked(ensureIndex).mock.calls.some((call) => call[1] === 'collection-4')).toBe(false);
});
