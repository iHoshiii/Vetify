import { ObjectId } from 'mongodb';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { clearTestDb, startTestDb, stopTestDb } from '../../test-utils/db';
import {
  BLOG_PUBLIC_STATUSES,
  BLOG_SEARCH_INDEX,
  blogsCollection,
  countBlogsByStatus,
  findBlogBySlug,
  findBlogs,
  insertBlog,
  slugify,
  toBlogPage,
  toBlogSummary,
  toPublicBlog,
  updateBlog,
  type BlogAttrs,
} from '../blogs';

beforeAll(startTestDb, 120_000);
afterEach(clearTestDb);
afterAll(stopTestDb);

const author = new ObjectId();

const TITLE = 'Spot early signs that your pet needs a vet visit';
const TITLE_SLUG = 'spot-early-signs-that-your-pet-needs-a-vet-visit';

function attrs(overrides: Partial<BlogAttrs> = {}): BlogAttrs {
  return {
    title: TITLE,
    excerpt: 'Small changes in appetite and mood usually come first.',
    body: 'A longer piece of prose than any excerpt would carry.',
    author,
    ...overrides,
  };
}

/**
 * Puts a post live at a fixed moment. Three inserts can land in the same
 * millisecond, which would leave any ordering assertion to chance.
 */
async function publish(title: string, when: string, overrides: Partial<BlogAttrs> = {}) {
  const blog = await insertBlog(attrs({ title, status: 'published', ...overrides }));
  await blogsCollection().updateOne({ _id: blog._id }, { $set: { publishedAt: new Date(when) } });
  return blog;
}

describe('slugify', () => {
  it('turns a headline into something a URL can carry', () => {
    expect(slugify('Spot early signs — a guide!')).toBe('spot-early-signs-a-guide');
  });

  it('folds accents onto their base letter instead of dropping the word', () => {
    expect(slugify('Café résumé for pets')).toBe('cafe-resume-for-pets');
  });

  it('caps the length without leaving a dash hanging off the end', () => {
    const slug = slugify(Array.from({ length: 40 }, () => 'vet').join(' '));

    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('falls back rather than leaving a post with no address at all', () => {
    // A title with nothing Latin left in it after folding. The fallback plus the
    // suffixes `insertBlog` adds keep those posts reachable and distinct.
    expect(slugify('日本語')).toBe('post');
  });
});

describe('insertBlog', () => {
  it('mints the slug from the title and starts as an unpublished draft', async () => {
    const blog = await insertBlog(attrs());

    expect(blog).toMatchObject({
      slug: TITLE_SLUG,
      status: 'draft',
      publishedAt: null,
      tags: [],
      coverUrl: null,
      // Nothing has been actioned, so there is no trail yet.
      removedBy: null,
      removedReason: null,
      removedAt: null,
    });
    expect(blog.author).toEqual(author);
    expect(blog.createdAt).toBeInstanceOf(Date);
  });

  it('stamps the publication date when a post is created live', async () => {
    const blog = await insertBlog(attrs({ status: 'published' }));

    expect(blog.publishedAt).toBeInstanceOf(Date);
  });

  it('gives a second post with the same title its own address', async () => {
    const first = await insertBlog(attrs());
    const second = await insertBlog(attrs());
    const third = await insertBlog(attrs());

    // The unique index is what rejects the first attempt — this is the retry
    // reacting to a real duplicate-key error, not a read-then-write guess.
    expect([first.slug, second.slug, third.slug]).toEqual([
      TITLE_SLUG,
      `${TITLE_SLUG}-2`,
      `${TITLE_SLUG}-3`,
    ]);
  });

  it('slugifies a slug the caller pinned, rather than trusting it', async () => {
    const blog = await insertBlog(attrs({ slug: 'Vet Visit Signs' }));

    expect(blog.slug).toBe('vet-visit-signs');
  });

  it('refuses a post that names no real author', async () => {
    await expect(insertBlog(attrs({ author: 'not-an-object-id' }))).rejects.toThrow(
      /Author is required/
    );
  });
});

describe('reading posts', () => {
  it('hides a draft from a reader who guessed the slug', async () => {
    const blog = await insertBlog(attrs());

    expect(await findBlogBySlug(blog.slug, BLOG_PUBLIC_STATUSES)).toBeNull();
    // Still findable for the author's own editor and for the admin screens.
    expect(await findBlogBySlug(blog.slug)).not.toBeNull();
  });

  it('lists published posts newest first', async () => {
    await publish('Oldest post', '2026-01-01');
    await publish('Newest post', '2026-03-01');
    await publish('Middle post', '2026-02-01');

    const { items } = await findBlogs({ statuses: BLOG_PUBLIC_STATUSES });

    expect(items.map((item) => item.title)).toEqual(['Newest post', 'Middle post', 'Oldest post']);
  });

  it('leaves drafts and takedowns out of the feed', async () => {
    await publish('Live post', '2026-03-01');
    await insertBlog(attrs({ title: 'Still a draft' }));
    const removed = await publish('Taken down', '2026-02-01');
    await updateBlog(removed._id, { status: 'removed' });

    const { items, total } = await findBlogs({ statuses: BLOG_PUBLIC_STATUSES });

    expect(items.map((item) => item.title)).toEqual(['Live post']);
    // The total drives the pager, so it has to count the same set as the page.
    expect(total).toBe(1);
  });

  it('pages rather than handing back the whole collection', async () => {
    for (let i = 1; i <= 5; i++) await publish(`Post ${i}`, `2026-0${i}-01`);

    const first = await findBlogs({ statuses: BLOG_PUBLIC_STATUSES, page: 1, limit: 2 });
    const last = await findBlogs({ statuses: BLOG_PUBLIC_STATUSES, page: 3, limit: 2 });

    expect(first.items).toHaveLength(2);
    expect(first.total).toBe(5);
    expect(last.items).toHaveLength(1);
  });

  it('caps an unasked-for page at the default rather than scanning everything', async () => {
    for (let i = 1; i <= 10; i++)
      await insertBlog(attrs({ title: `Post ${i}`, status: 'published' }));

    const { items, total } = await findBlogs({ statuses: BLOG_PUBLIC_STATUSES });

    expect(items).toHaveLength(9);
    expect(total).toBe(10);
  });

  it('filters by tag', async () => {
    await publish('For dogs', '2026-01-01', { tags: ['dogs', 'anxiety'] });
    await publish('For cats', '2026-02-01', { tags: ['cats'] });

    const { items } = await findBlogs({ statuses: BLOG_PUBLIC_STATUSES, tag: 'dogs' });

    expect(items.map((item) => item.title)).toEqual(['For dogs']);
  });

  it('ranks a search by relevance rather than by date', async () => {
    // Newer, but the match is only in its excerpt.
    await publish('Clinic appointment checklist', '2026-03-01', {
      excerpt: 'What to prepare, even for an anxious pet.',
    });
    // Older, but the match is in the title, which the index weights ten times
    // higher — otherwise searching would just be a differently sorted feed.
    await publish('Calm an anxious dog at home', '2026-01-01');

    const { items } = await findBlogs({ statuses: BLOG_PUBLIC_STATUSES, q: 'anxious' });

    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Calm an anxious dog at home');
  });
});

describe('updateBlog', () => {
  it('stamps the publication date the first time a draft goes live', async () => {
    const draft = await insertBlog(attrs());

    const live = await updateBlog(draft._id, { status: 'published' });

    expect(live?.publishedAt).toBeInstanceOf(Date);
  });

  it('keeps the original date when a post comes back from a takedown', async () => {
    const blog = await publish('Live post', '2026-01-01');
    await updateBlog(blog._id, { status: 'hidden' });

    const restored = await updateBlog(blog._id, { status: 'published' });

    // Re-publishing is not re-writing history: an edited post should not jump
    // back to the top of the feed ahead of everything posted since.
    expect(restored?.publishedAt).toEqual(new Date('2026-01-01'));
    expect(restored?.updatedAt.getTime()).toBeGreaterThan(blog.updatedAt.getTime());
  });

  it('records who took a post down and why', async () => {
    const moderator = new ObjectId();
    const blog = await publish('Live post', '2026-01-01');

    const removed = await updateBlog(blog._id, {
      status: 'removed',
      removedBy: moderator,
      removedReason: 'copied wholesale from another site',
      removedAt: new Date('2026-04-01'),
    });

    expect(removed).toMatchObject({
      status: 'removed',
      removedBy: moderator,
      removedReason: 'copied wholesale from another site',
    });
    // Soft delete: the row survives, so the reason and the reviewer survive with it.
    expect(await blogsCollection().countDocuments()).toBe(1);
  });

  it('reports a missing post instead of creating one', async () => {
    expect(await updateBlog(new ObjectId(), { status: 'published' })).toBeNull();
    expect(await blogsCollection().countDocuments()).toBe(0);
  });

  it('leaves a post alone when the patch is empty', async () => {
    const blog = await insertBlog(attrs());

    const unchanged = await updateBlog(blog._id, {});

    expect(unchanged).toEqual(blog);
  });
});

describe('countBlogsByStatus', () => {
  it('counts each shelf for the admin breakdown', async () => {
    await insertBlog(attrs({ title: 'Draft one' }));
    await insertBlog(attrs({ title: 'Draft two' }));
    await insertBlog(attrs({ title: 'Live', status: 'published' }));

    expect(await countBlogsByStatus()).toEqual({ draft: 2, published: 1 });
  });
});

describe('public shapes', () => {
  it('keeps the takedown trail out of a public post', async () => {
    const blog = await publish('Live post', '2026-01-01');
    const removed = await updateBlog(blog._id, {
      status: 'removed',
      removedBy: new ObjectId(),
      removedReason: 'internal note nobody outside should read',
    });

    const shape = toPublicBlog(removed!);

    expect(Object.keys(shape)).not.toContain('removedReason');
    expect(JSON.stringify(shape)).not.toContain('internal note');
    expect(shape).toMatchObject({
      id: blog._id.toString(),
      authorId: author.toString(),
      // ISO strings, because that is what the client parses off the wire.
      publishedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('drops the body from the list form', async () => {
    const blog = await insertBlog(attrs());

    const summary = toBlogSummary(blog);

    expect('body' in summary).toBe(false);
    expect(summary.excerpt).toBe(blog.excerpt);
  });

  it('reports at least one page, even with nothing to show', () => {
    expect(toBlogPage({ items: [], total: 0, page: 1, limit: 9 })).toMatchObject({
      items: [],
      total: 0,
      pages: 1,
    });
  });

  it('rounds a partial last page up', () => {
    expect(toBlogPage({ items: [], total: 10, page: 1, limit: 9 }).pages).toBe(2);
  });
});

describe('blog indexes', () => {
  it('lets the database enforce slug uniqueness', async () => {
    const indexes = await blogsCollection().indexes();
    const slug = indexes.find((index) => index.key.slug === 1);

    expect(slug?.unique).toBe(true);
  });

  it('indexes the feed, an author’s output, and admin search', async () => {
    const indexes = await blogsCollection().indexes();

    expect(indexes.map((index) => index.key)).toEqual(
      expect.arrayContaining([
        { status: 1, publishedAt: -1 },
        { author: 1, createdAt: -1 },
      ])
    );
    // Mongo rewrites a text index's key to its internal `{ _fts, _ftsx }` form,
    // so the name is the only thing left to recognise it by.
    expect(indexes.some((index) => index.name === BLOG_SEARCH_INDEX)).toBe(true);
  });

  it('keeps posts forever — no TTL', async () => {
    const indexes = await blogsCollection().indexes();

    expect(indexes.every((index) => index.expireAfterSeconds === undefined)).toBe(true);
  });
});
