import {
  getAdminBlog,
  listAdminBlogs,
  moderateBlog,
  purgeBlog,
  type AdminBlogDetail,
  type AdminBlogListParams,
  type AdminBlogSummary,
  type AdminPage,
  type BlogDecisionResult,
  type PurgeBlogResult,
} from '@/services/admin.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { blogKeys } from './useBlogs';
import { ADMIN_STALE_TIME, adminKeys, invalidateAdmin, retryUnlessRefused } from './admin-keys';

/** One page of posts, every status included — the whole point of this list. */
export function useAdminBlogs(params: AdminBlogListParams = {}) {
  return useQuery<AdminPage<AdminBlogSummary>>({
    queryKey: adminKeys.blogList(params),
    queryFn: ({ signal }) => listAdminBlogs(params, signal),
    staleTime: ADMIN_STALE_TIME,
    placeholderData: (previous) => previous,
    retry: retryUnlessRefused,
  });
}

/** One post with its body, which is what a decision is actually made from. */
export function useAdminBlog(id: string | undefined) {
  return useQuery<AdminBlogDetail>({
    queryKey: adminKeys.blog(id ?? ''),
    queryFn: ({ signal }) => getAdminBlog(id as string, signal),
    enabled: Boolean(id),
    staleTime: ADMIN_STALE_TIME,
    retry: retryUnlessRefused,
  });
}

/**
 * Approve, hide, take down, or restore.
 *
 * The public feed is invalidated too, not just the admin list: a post that was
 * taken down has to leave /blogs, and the visitor cache does not know that
 * happened. Cheap, and the alternative is a reader still being served something an
 * admin has already removed.
 */
export function useModerateBlog() {
  const queryClient = useQueryClient();

  return useMutation<
    BlogDecisionResult,
    Error,
    { id: string; decision: 'approve' | 'hide' | 'remove' | 'restore'; reason?: string }
  >({
    mutationFn: moderateBlog,
    onSuccess: (result) => {
      queryClient.setQueryData(adminKeys.blog(result.blog.id), result.blog);
      invalidateAdmin(queryClient, adminKeys.blogs());
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  });
}

/**
 * Deletes a post for good.
 *
 * The row is dropped from the cache rather than invalidated: there is nothing left
 * to refetch, and leaving the key to be re-requested would spend a round trip
 * learning that. The public feed is invalidated all the same — a post that had been
 * taken down was already absent from it, but the count behind the pager was not.
 */
export function usePurgeBlog() {
  const queryClient = useQueryClient();

  return useMutation<PurgeBlogResult, Error, { id: string; reason: string }>({
    mutationFn: purgeBlog,
    onSuccess: (result) => {
      queryClient.removeQueries({ queryKey: adminKeys.blog(result.id) });
      invalidateAdmin(queryClient, adminKeys.blogs());
      void queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  });
}
