import type { PageParams, Thread, ThreadPage, ThreadState } from '@/services/messages.service';
import type { QueryClient, QueryKey } from '@tanstack/react-query';

type Snapshot = Array<[QueryKey, ThreadPage | undefined]>;

function shelfOf(key: QueryKey): ThreadState {
  const params = key[3] as PageParams | undefined;
  return params?.state ?? 'active';
}

export function moveCachedThread(
  queryClient: QueryClient,
  listKey: readonly string[],
  threadId: string,
  state: ThreadState
): void {
  const pages = queryClient.getQueriesData<ThreadPage>({ queryKey: listKey });
  const bySide = new Map<string, Thread>();
  pages.forEach(([key, page]) => {
    const thread = page?.items.find((item) => item.id === threadId);
    if (thread) bySide.set(String(key[2]), thread);
  });

  pages.forEach(([key, page]) => {
    if (!page) return;
    const existing = page.items.find((item) => item.id === threadId);
    const moving = bySide.get(String(key[2]));
    const belongsHere = state !== 'deleted' && shelfOf(key) === state && page.page === 1;
    const items = page.items.filter((item) => item.id !== threadId);
    if (belongsHere && moving) items.unshift({ ...moving, state });
    if (!existing && !(belongsHere && moving)) return;
    const total = Math.max(0, page.total - Number(Boolean(existing)) + Number(belongsHere));
    queryClient.setQueryData(key, {
      ...page,
      items,
      total,
      pages: Math.max(1, Math.ceil(total / page.limit)),
    });
  });
}

export function snapshotThreadLists(
  queryClient: QueryClient,
  listKey: readonly string[]
): Snapshot {
  return queryClient.getQueriesData<ThreadPage>({ queryKey: listKey });
}

export function restoreThreadLists(queryClient: QueryClient, snapshots?: Snapshot): void {
  snapshots?.forEach(([key, page]) => queryClient.setQueryData(key, page));
}
