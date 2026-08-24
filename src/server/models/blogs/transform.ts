import type { BlogDocument, BlogPage, BlogSummary, PublicBlog } from './types';

/**
 * The post as a reader receives it.
 *
 * `removedBy` / `removedReason` / `removedAt` are absent by construction rather
 * than by remembering to delete them: who took a post down, and why, is not
 * public. Returning the raw document is how that leaks, so no route does.
 */
export function toPublicBlog(blog: BlogDocument): PublicBlog {
  return {
    id: blog._id.toString(),
    title: blog.title,
    slug: blog.slug,
    excerpt: blog.excerpt,
    body: blog.body,
    coverUrl: blog.coverUrl ?? null,
    tags: blog.tags ?? [],
    authorId: blog.author.toString(),
    status: blog.status,
    publishedAt: blog.publishedAt?.toISOString() ?? null,
    createdAt: blog.createdAt.toISOString(),
    updatedAt: blog.updatedAt.toISOString(),
  };
}

/**
 * List form: everything above except the body, which across a page of nine posts
 * is a great deal of text nobody on that screen is going to read.
 */
export function toBlogSummary(blog: BlogDocument): BlogSummary {
  const { body: _body, ...summary } = toPublicBlog(blog);
  return summary;
}

/**
 * Wraps a page of posts with the counts a pager needs, so the arithmetic lives in
 * one place instead of in every route that lists something.
 */
export function toBlogPage(input: {
  items: BlogDocument[];
  total: number;
  page: number;
  limit: number;
}): BlogPage {
  return {
    items: input.items.map(toBlogSummary),
    page: input.page,
    limit: input.limit,
    total: input.total,
    // At least one page, so an empty feed reads as "page 1 of 1" rather than
    // "page 1 of 0".
    pages: Math.max(1, Math.ceil(input.total / input.limit)),
  };
}
