import { apiFetch } from './api';

export type BlogStatus = 'draft' | 'published' | 'hidden' | 'removed';

/** A post as the feed returns it: everything except the body. */
export type BlogSummary = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverUrl: string | null;
  tags: string[];
  authorId: string;
  status: BlogStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A single post, body included. */
export type Blog = BlogSummary & { body: string };

export type BlogPage = {
  items: BlogSummary[];
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type BlogListParams = {
  page?: number;
  limit?: number;
  tag?: string;
  q?: string;
};

/** GET /api/v1/blogs — one page of published posts. */
export async function listBlogs(
  params: BlogListParams = {},
  signal?: AbortSignal
): Promise<BlogPage> {
  const search = new URLSearchParams();
  if (params.page && params.page > 1) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.tag) search.set('tag', params.tag);
  if (params.q) search.set('q', params.q);

  const query = search.toString();
  return apiFetch<BlogPage>(`/blogs${query ? `?${query}` : ''}`, { signal });
}

/** GET /api/v1/blogs/:slug — one post in full. 404s for anything unpublished. */
export async function getBlog(slug: string, signal?: AbortSignal): Promise<Blog> {
  return apiFetch<Blog>(`/blogs/${encodeURIComponent(slug)}`, { signal });
}
