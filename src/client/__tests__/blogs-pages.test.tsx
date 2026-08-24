import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BlogDetailPage from '../pages/blogs/blog-detail-page';
import BlogsPage from '../pages/blogs/blogs-page';
import { ApiError } from '../services/api';
import type { Blog, BlogPage, BlogSummary } from '../services/blogs.service';
import { getBlog, listBlogs } from '../services/blogs.service';

vi.mock('../services/blogs.service', () => ({
  listBlogs: vi.fn(),
  getBlog: vi.fn(),
}));

function summary(overrides: Partial<BlogSummary> = {}): BlogSummary {
  return {
    id: '65f000000000000000000001',
    title: 'Spot early signs that your pet needs a vet visit',
    slug: 'spot-early-signs',
    excerpt: 'Small changes in appetite and mood usually come first.',
    coverUrl: null,
    tags: ['health'],
    authorId: '65f0000000000000000000ff',
    status: 'published',
    publishedAt: '2026-08-01T09:00:00.000Z',
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-01T09:00:00.000Z',
    ...overrides,
  };
}

function feed(items: BlogSummary[], overrides: Partial<BlogPage> = {}): BlogPage {
  return { items, page: 1, limit: 9, total: items.length, pages: 1, ...overrides };
}

function post(overrides: Partial<Blog> = {}): Blog {
  return { ...summary(), body: 'A body long enough to read.', ...overrides };
}

/** A fresh cache per render, so one test's feed cannot answer another's query. */
function wrap(path: string, element: ReactNode, routePath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const renderFeed = (path = '/blogs') => wrap(path, <BlogsPage />, '/blogs');
const renderPost = (slug = 'spot-early-signs') =>
  wrap(`/blogs/${slug}`, <BlogDetailPage />, '/blogs/:slug');

beforeEach(() => {
  vi.mocked(listBlogs).mockReset();
  vi.mocked(getBlog).mockReset();
  // jsdom has no layout, so the paging scroll would log an unimplemented warning.
  window.scrollTo = vi.fn();
});

describe('BlogsPage', () => {
  it('renders a card per post, each linking to its own slug', async () => {
    vi.mocked(listBlogs).mockResolvedValue(
      feed([
        summary(),
        summary({
          id: '2',
          title: 'Calmer routines',
          slug: 'calmer-routines',
          excerpt: 'Anxiety answers to predictability.',
        }),
      ])
    );

    renderFeed();

    const link = await screen.findByRole('link', { name: 'Calmer routines' });
    expect(link).toHaveAttribute('href', '/blogs/calmer-routines');
    expect(screen.getByText(/Small changes in appetite/)).toBeInTheDocument();
    expect(screen.getByText('Anxiety answers to predictability.')).toBeInTheDocument();
  });

  it('passes the tag from the URL to the query and offers a way out of it', async () => {
    vi.mocked(listBlogs).mockResolvedValue(feed([summary()]));

    renderFeed('/blogs?tag=health');

    await waitFor(() => expect(listBlogs).toHaveBeenCalled());
    expect(listBlogs).toHaveBeenCalledWith({ page: 1, tag: 'health' }, expect.anything());
    expect(await screen.findByRole('link', { name: 'Clear filter' })).toHaveAttribute(
      'href',
      '/blogs'
    );
  });

  it('says which topic came back empty rather than showing a bare blank grid', async () => {
    vi.mocked(listBlogs).mockResolvedValue(feed([], { total: 0 }));

    renderFeed('/blogs?tag=parrots');

    expect(await screen.findByText(/Nothing tagged “parrots” yet/)).toBeInTheDocument();
  });

  it('offers a retry when the feed fails', async () => {
    vi.mocked(listBlogs).mockRejectedValueOnce(new ApiError(400, 'Invalid query parameters.'));

    renderFeed();

    const retry = await screen.findByRole('button', { name: 'Try again' });
    // A 4xx is an answer: one call, no automatic second attempt behind it.
    expect(listBlogs).toHaveBeenCalledTimes(1);

    vi.mocked(listBlogs).mockResolvedValue(feed([summary()]));

    await userEvent.click(retry);

    expect(
      await screen.findByRole('link', { name: /Spot early signs that your pet needs/ })
    ).toBeInTheDocument();
  });

  it('asks for the next page only when there is one', async () => {
    vi.mocked(listBlogs).mockResolvedValue(feed([summary()], { pages: 1 }));

    const single = renderFeed();
    expect(await screen.findByText(/Small changes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    single.unmount();

    vi.mocked(listBlogs).mockResolvedValue(feed([summary()], { pages: 3, total: 20 }));
    renderFeed();

    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));

    await waitFor(() =>
      expect(listBlogs).toHaveBeenLastCalledWith({ page: 2, tag: undefined }, expect.anything())
    );
  });
});

describe('BlogDetailPage', () => {
  it('renders the markdown body as elements', async () => {
    vi.mocked(getBlog).mockResolvedValue(
      post({ body: '## What to watch for\n\n- **Appetite.** One skipped meal is nothing.' })
    );

    renderPost();

    expect(
      await screen.findByRole('heading', { level: 2, name: 'What to watch for' })
    ).toBeVisible();
    expect(screen.getByRole('listitem')).toHaveTextContent('One skipped meal is nothing.');
  });

  it('shows HTML in a body as text instead of running it', async () => {
    vi.mocked(getBlog).mockResolvedValue(
      post({ body: 'Careful now.\n\n<script>alert(1)</script><img src="x" onerror="alert(2)">' })
    );

    const { container } = renderPost();

    await screen.findByText('Careful now.');
    // Bodies are written by professionals and admins, not by us. Markdown that
    // reaches the DOM as markup is a stored XSS handed to every author.
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(await screen.findByText(/alert\(1\)/)).toBeInTheDocument();
  });

  it('does not claim a missing post never existed', async () => {
    vi.mocked(getBlog).mockRejectedValue(new ApiError(404, 'Post not found.'));

    renderPost('no-such-post');

    // A draft and a typo answer identically on the server, so the page cannot
    // say more than this without leaking which one it was.
    expect(await screen.findByText('This post is not available.')).toBeInTheDocument();
    expect(getBlog).toHaveBeenCalledTimes(1);
  });
});
