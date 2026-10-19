import { act, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import pages from '@shared/public-pages.json';
import { SearchMetadata } from '@/seo/SearchMetadata';
import { updateSearchMetadata } from '@/seo/metadata';

beforeEach(() => {
  document.head.innerHTML = '<title>Vetify</title><meta name="description" content="Old">';
});

describe('public search metadata', () => {
  it('keeps route titles, descriptions, canonical URLs and sharing data consistent', () => {
    for (const page of pages) {
      updateSearchMetadata(page.path);
      expect(document.title).toBe(page.title);
      expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
        'content',
        page.description
      );
      expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://vetify.page${page.path}`
      );
      expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute(
        'content',
        `https://vetify.page${page.path}`
      );
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
        'content',
        'index,follow'
      );
    }
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[name="description"]')).toHaveLength(1);
  });

  it('normalizes trailing slashes and replaces the homepage identity on navigation', () => {
    updateSearchMetadata('/');
    expect(document.getElementById('vetify-schema')).not.toBeNull();
    updateSearchMetadata('/about/');
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://vetify.page/about'
    );
    expect(document.getElementById('vetify-schema')).toBeNull();
    updateSearchMetadata('/');
    const graph = JSON.parse(document.getElementById('vetify-schema')!.textContent!);
    expect(graph['@graph'][1].url).toBe('https://vetify.page/');
  });

  it('does not publish private URLs or inherit a public canonical on application pages', () => {
    updateSearchMetadata('/');
    updateSearchMetadata('/call/private-appointment');
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex,follow'
    );
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[property="og:url"]')).toBeNull();
    expect(document.getElementById('vetify-schema')).toBeNull();
    expect(document.head.innerHTML).not.toContain('private-appointment');
  });

  it('updates metadata during React Router navigation without reloading', () => {
    let navigate: ReturnType<typeof useNavigate>;
    function Navigation() {
      navigate = useNavigate();
      return null;
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <SearchMetadata />
        <Navigation />
      </MemoryRouter>
    );
    expect(document.title).toBe(pages[0].title);
    act(() => navigate('/services'));
    expect(document.title).toBe(pages.find((page) => page.path === '/services')!.title);
    act(() => navigate('/login'));
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex,follow'
    );
  });
});
