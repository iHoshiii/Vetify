import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SiteHeader from '@/components/navbar/navbar-header';

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));
vi.mock('@/components/navbar/header-tools', () => ({ HeaderTools: () => null }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function show() {
  render(
    <MemoryRouter>
      <SiteHeader />
    </MemoryRouter>
  );
}

describe('responsive site navigation', () => {
  it('links directly to the Books application on desktop and mobile', () => {
    vi.stubEnv('VITE_BOOKS_ORIGIN', 'https://books.example.test/');
    show();
    const desktop = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(desktop).getByRole('link', { name: 'Books' })).toHaveAttribute(
      'href',
      'https://books.example.test/'
    );
    expect(within(desktop).getByRole('link', { name: 'Blogs' })).toHaveAttribute('href', '/blogs');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const mobile = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(mobile).getByRole('link', { name: 'Books' })).toHaveAttribute(
      'href',
      'https://books.example.test/'
    );
  });

  it('keeps Books on the safe local route when its configured origin is invalid', () => {
    vi.stubEnv('VITE_BOOKS_ORIGIN', 'https://user:secret@books.example.test');
    show();
    expect(screen.getByRole('link', { name: 'Books' })).toHaveAttribute('href', '/books');
  });

  it('keeps closed mobile links out of keyboard navigation and closes on Escape', () => {
    show();
    const toggle = screen.getByRole('button', { name: 'Toggle menu' });
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBeNull();
    fireEvent.click(toggle);
    const menu = screen.getByRole('navigation', { name: 'Mobile navigation' });
    expect(within(menu).getByRole('link', { name: 'Sign up' })).toBeVisible();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes the mobile menu and releases page scrolling after choosing a page', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    const menu = screen.getByRole('navigation', { name: 'Mobile navigation' });
    fireEvent.click(within(menu).getByRole('link', { name: 'About Us' }));
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('releases mobile navigation when the viewport changes to desktop', () => {
    const media = new EventTarget() as EventTarget & { matches: boolean };
    media.matches = false;
    vi.stubGlobal('matchMedia', () => media);
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }));
    media.matches = true;
    act(() => media.dispatchEvent(new Event('change')));
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
});
