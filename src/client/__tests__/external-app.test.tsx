import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { externalAppOrigin } from '../lib/external-app';
import ExternalAppPage from '../pages/external-app/external-app-page';
import BlogsLaunchPage from '../pages/external-app/blogs-launch-page';

afterEach(() => vi.unstubAllEnvs());

describe('external feature destinations', () => {
  it.each([
    undefined,
    '',
    'not a URL',
    'javascript:alert(1)',
    'http://books.example.test',
    'https://user:password@books.example.test',
    'https://books.example.test/path',
    'https://books.example.test/?access_token=secret',
    'https://books.example.test/#secret',
  ])('refuses an absent or unsafe production origin: %s', (value) => {
    expect(externalAppOrigin(value, false)).toBeNull();
  });

  it('accepts a clean HTTPS origin', () => {
    expect(externalAppOrigin(' https://books.example.test/ ', false)).toBe(
      'https://books.example.test'
    );
  });

  it('allows loopback HTTP only in local development', () => {
    expect(externalAppOrigin('http://localhost:5175', true)).toBe('http://localhost:5175');
    expect(externalAppOrigin('http://localhost:5175', false)).toBeNull();
    expect(externalAppOrigin('http://remote.example.test', true)).toBeNull();
  });
});

describe('feature launch pages', () => {
  it.each(['books', 'anatomy', 'blogs'] as const)(
    'shows %s unavailable without a destination',
    (feature) => {
      vi.stubEnv('VITE_BOOKS_ORIGIN', '');
      vi.stubEnv('VITE_ANATOMY_ORIGIN', '');
      vi.stubEnv('VITE_BLOGS_ORIGIN', '');
      render(
        <MemoryRouter>
          <ExternalAppPage feature={feature} />
        </MemoryRouter>
      );
      expect(screen.getByText(/is not available yet/)).toBeVisible();
      expect(screen.queryByRole('link', { name: /^Open Vetify/ })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to Vetify' })).toHaveAttribute('href', '/');
    }
  );

  it.each(['/manage', '/affiliate'] as const)(
    'opens Books %s without transferring credentials',
    (destination) => {
      vi.stubEnv('VITE_BOOKS_ORIGIN', 'https://books.example.test');
      render(
        <MemoryRouter>
          <ExternalAppPage feature="books" destination={destination} />
        </MemoryRouter>
      );
      expect(screen.getByRole('link', { name: 'Open Vetify Books' })).toHaveAttribute(
        'href',
        `https://books.example.test${destination}`
      );
    }
  );

  it('opens Anatomy at its own configured origin', () => {
    vi.stubEnv('VITE_ANATOMY_ORIGIN', 'https://anatomy.example.test');
    render(
      <MemoryRouter>
        <ExternalAppPage feature="anatomy" />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Open Vetify Anatomy' })).toHaveAttribute(
      'href',
      'https://anatomy.example.test/'
    );
  });

  it.each([
    ['/blogs', '/blogs'],
    ['/blogs/pet-care', '/blogs/pet-care'],
    ['/blogs/a%2Fb', '/blogs/a%2Fb'],
  ])('preserves the Blog destination from %s', (entry, destination) => {
    vi.stubEnv('VITE_BLOGS_ORIGIN', 'https://blog.example.test');
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/blogs/:slug?" element={<BlogsLaunchPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Open Vetify Blogs' })).toHaveAttribute(
      'href',
      `https://blog.example.test${destination}`
    );
  });

  it('opens Blog moderation in the separate application', () => {
    vi.stubEnv('VITE_BLOGS_ORIGIN', 'https://blog.example.test');
    render(
      <MemoryRouter>
        <ExternalAppPage feature="blogs" destination="/admin" />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Open Vetify Blogs' })).toHaveAttribute(
      'href',
      'https://blog.example.test/admin'
    );
  });
});
