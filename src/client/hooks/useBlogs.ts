import { ApiError } from '@/services/api';
import {
  type Blog,
  type BlogListParams,
  type BlogPage,
  getBlog,
  listBlogs,
} from '@/services/blogs.service';
import { useQuery } from '@tanstack/react-query';

/**
 * Cache keys for everything blog-shaped. Built as a factory so an invalidation
 * can target one post, one list, or every blog query, without any caller
 * hand-writing an array that has to match this one character for character.
 */
export const blogKeys = {
  all: ['blogs'] as const,
  lists: () => [...blogKeys.all, 'list'] as const,
  list: (params: BlogListParams) => [...blogKeys.lists(), params] as const,
  details: () => [...blogKeys.all, 'detail'] as const,
  detail: (slug: string) => [...blogKeys.details(), slug] as const,
};

/** Posts do not change minute to minute; a fresh fetch on every mount is waste. */
const STALE_TIME = 60_000;

/**
 * A 404 is an answer, not a failure to reach the server. Retrying one costs three
 * more round trips and still ends on the same empty state.
 */
function retryUnlessMissing(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

/** One page of the published feed. */
export function useBlogs(params: BlogListParams = {}) {
  return useQuery<BlogPage>({
    queryKey: blogKeys.list(params),
    queryFn: ({ signal }) => listBlogs(params, signal),
    staleTime: STALE_TIME,
    // Paging keeps the previous page on screen instead of flashing the skeleton
    // back in, which is the difference between paging and reloading.
    placeholderData: (previous) => previous,
    retry: retryUnlessMissing,
  });
}

/** One post in full. Disabled until there is a slug to ask for. */
export function useBlog(slug: string | undefined) {
  return useQuery<Blog>({
    queryKey: blogKeys.detail(slug ?? ''),
    queryFn: ({ signal }) => getBlog(slug as string, signal),
    enabled: Boolean(slug),
    staleTime: STALE_TIME,
    retry: retryUnlessMissing,
  });
}
