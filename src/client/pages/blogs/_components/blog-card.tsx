import type { BlogSummary } from '@/services/blogs.service';
import { Link } from 'react-router-dom';

import { PublishedDate } from './published-date';

/** One post in the feed. The body never travels with the list, so this is all there is. */
export function BlogCard({ post }: { post: BlogSummary }) {
  return (
    <article className="flex flex-col bg-white p-6">
      {post.coverUrl && (
        // Decorative: the headline underneath already carries the meaning, so a
        // description here would only repeat it to a screen reader.
        <img
          src={post.coverUrl}
          alt=""
          loading="lazy"
          className="mb-4 aspect-[16/9] w-full rounded-md object-cover"
        />
      )}

      <h2 className="text-lg font-black tracking-tight">
        <Link to={`/blogs/${post.slug}`} className="hover:text-teal-800">
          {post.title}
        </Link>
      </h2>

      <p className="mt-3 leading-7 text-slate-600">{post.excerpt}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
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
    </article>
  );
}
