import { useBlog } from '@/hooks/useBlogs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ApiError } from '@/services/api';
import { Link, useParams } from 'react-router-dom';

import { BlogBody } from './_components/blog-body';
import { DetailError, DetailMissing, DetailSkeleton } from './_components/detail-states';
import { PublishedDate } from './_components/published-date';

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const query = useBlog(slug);
  const post = query.data;

  useDocumentTitle(post?.title, post?.excerpt);

  const missing = query.error instanceof ApiError && query.error.status === 404;

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <article className="mx-auto max-w-3xl">
        {query.isError ? (
          missing ? (
            <DetailMissing />
          ) : (
            <DetailError
              message={(query.error as Error).message}
              onRetry={() => void query.refetch()}
            />
          )
        ) : query.isPending || !post ? (
          <DetailSkeleton />
        ) : (
          <>
            <Link
              to="/blogs"
              className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800 hover:underline"
            >
              ← All posts
            </Link>

            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">{post.title}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <PublishedDate value={post.publishedAt} />
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  to={`/blogs?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full bg-teal-900/5 px-2 py-1 font-semibold text-teal-800 hover:bg-teal-900/10"
                >
                  {tag}
                </Link>
              ))}
            </div>

            {post.coverUrl && (
              // Decorative: the headline above says everything this repeats.
              <img
                src={post.coverUrl}
                alt=""
                className="mt-8 aspect-[16/9] w-full rounded-lg object-cover"
              />
            )}

            <p className="mt-8 text-lg font-semibold leading-8 text-slate-700">{post.excerpt}</p>

            <BlogBody>{post.body}</BlogBody>
          </>
        )}
      </article>
    </main>
  );
}
