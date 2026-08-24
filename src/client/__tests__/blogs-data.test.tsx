import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { blogKeys, useBlog, useBlogs } from '../hooks/useBlogs';
import { getBlog, listBlogs } from '../services/blogs.service';

const PAGE = { items: [], page: 1, limit: 9, total: 0, pages: 1 };

/** Stands in for fetch, so the hooks exercise the real service on the way down. */
function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

/** Each test gets its own cache, so a key collision cannot leak between them. */
function withClient() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** The path fetch was called with, minus the base URL. */
function requestedPath(fetchMock: ReturnType<typeof respond>): string {
  return String(fetchMock.mock.calls[0]?.[0]).replace('/api/v1', '');
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('listBlogs', () => {
  it('asks for the bare feed when there is nothing to narrow it by', async () => {
    const fetchMock = respond(PAGE);
    vi.stubGlobal('fetch', fetchMock);

    await listBlogs();

    // A '?page=1' on every first visit would give the same page a second cache
    // key, both here and in any CDN in front of it.
    expect(requestedPath(fetchMock)).toBe('/blogs');
  });

  it('carries page, limit, tag and search through to the query string', async () => {
    const fetchMock = respond(PAGE);
    vi.stubGlobal('fetch', fetchMock);

    await listBlogs({ page: 2, limit: 3, tag: 'cats', q: 'fleas' });

    expect(requestedPath(fetchMock)).toBe('/blogs?page=2&limit=3&tag=cats&q=fleas');
  });
});

describe('getBlog', () => {
  it('escapes the slug rather than pasting it into the path', async () => {
    const fetchMock = respond({ ...PAGE, slug: 'a b' });
    vi.stubGlobal('fetch', fetchMock);

    await getBlog('a b/../secret');

    expect(requestedPath(fetchMock)).toBe('/blogs/a%20b%2F..%2Fsecret');
  });
});

describe('blogKeys', () => {
  it('keys two different pages apart, and both under the same root', () => {
    expect(blogKeys.list({ page: 1 })).not.toEqual(blogKeys.list({ page: 2 }));
    // An invalidation of blogKeys.all has to reach lists and details alike.
    expect(blogKeys.detail('a-post').slice(0, 1)).toEqual([...blogKeys.all]);
  });
});

describe('useBlogs', () => {
  it('returns the page the API sent', async () => {
    vi.stubGlobal('fetch', respond({ ...PAGE, total: 1, items: [{ title: 'Live post' }] }));

    const { result } = renderHook(() => useBlogs(), { wrapper: withClient() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });
});

describe('useBlog', () => {
  it('gives up on a 404 instead of asking three more times', async () => {
    const fetchMock = respond({ error: 'Post not found' }, 404);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useBlog('no-such-post'), { wrapper: withClient() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // A missing post is an answer. Retrying it costs three round trips and lands
    // on the same empty state.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks for nothing until it has a slug', () => {
    const fetchMock = respond(PAGE);
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useBlog(undefined), { wrapper: withClient() });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});
