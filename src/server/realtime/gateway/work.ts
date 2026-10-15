import { AsyncLocalStorage } from 'node:async_hooks';

const pending = new AsyncLocalStorage<Set<Promise<void>>>();
export function queueDelivery(job: Promise<void>): void {
  const guarded = job.catch(() =>
    console.warn('[realtime] delivery failed; persisted data remains available')
  );
  pending.getStore()?.add(guarded);
}

export async function withRealtimeWork<T>(job: () => Promise<T>): Promise<T> {
  const jobs = new Set<Promise<void>>();
  return pending.run(jobs, async () => {
    try {
      return await job();
    } finally {
      while (jobs.size) {
        const batch = [...jobs];
        jobs.clear();
        await Promise.all(batch);
      }
    }
  });
}
