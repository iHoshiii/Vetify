import {
  getAdminBlog,
  listAdminBlogs,
  moderateBlog,
  type AdminBlogDetail,
  type AdminBlogListParams,
  type AdminBlogSummary,
  type AdminPage,
  type BlogDecisionResult,
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
