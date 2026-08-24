import { useBlogs } from '@/hooks/useBlogs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Link, useSearchParams } from 'react-router-dom';

import { BlogCard } from './_components/blog-card';
import { BlogPagination } from './_components/blog-pagination';
import { FeedEmpty, FeedError, FeedSkeleton } from './_components/feed-states';

const GRID =
  'mt-10 grid gap-px overflow-hidden rounded-lg border border-teal-900/10 bg-teal-900/10 md:grid-cols-3';

/** `?page=abc` and `?page=-4` both mean the first page, not an error. */
function pageFrom(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

export default function BlogsPage() {
  useDocumentTitle('Blogs', 'Practical pet care notes from the Vetify team.');

  const [params, setParams] = useSearchParams();
  const tag = params.get('tag') ?? undefined;
  const page = pageFrom(params.get('page'));

  const feed = useBlogs({ page, tag });
  const posts = feed.data?.items ?? [];

  function goToPage(next: number): void {
    const updated = new URLSearchParams(params);
    if (next > 1) updated.set('page', String(next));
    else updated.delete('page');

    setParams(updated);
    // ScrollToTop only watches the pathname, and paging changes the query
    // string — without this, page two opens at the bottom of page one.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <main className="min-h-screen bg-[#f6fbfb] px-5 py-14 text-slate-950 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-teal-800">Blogs</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Practical pet care notes.
        </h1>

        {tag && (
          <p className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>
              Tagged <strong className="font-bold text-teal-900">{tag}</strong>
            </span>
            <Link to="/blogs" className="font-bold text-teal-800 hover:underline">
              Clear filter
            </Link>
          </p>
        )}

        {feed.isError ? (
          <FeedError message={(feed.error as Error).message} onRetry={() => void feed.refetch()} />
        ) : !feed.isPending && posts.length === 0 ? (
          <FeedEmpty tag={tag} />
        ) : (
          <>
            {/* Dimmed while the next page is in flight: the current one stays
                readable, and it is visible that it is no longer current. */}
            <div className={`${GRID} ${feed.isFetching ? 'opacity-60' : ''}`}>
              {feed.isPending ? (
                <FeedSkeleton />
              ) : (
                posts.map((post) => <BlogCard key={post.id} post={post} />)
              )}
            </div>

            <BlogPagination page={page} pages={feed.data?.pages ?? 1} onPage={goToPage} />
          </>
        )}
      </section>
    </main>
  );
}
