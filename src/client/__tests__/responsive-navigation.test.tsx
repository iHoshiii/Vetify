import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SiteHeader from '@/components/navbar/navbar-header';

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));
vi.mock('@/components/navbar/header-tools', () => ({ HeaderTools: () => null }));
afterEach(() => vi.unstubAllGlobals());
function show() {
  render(
    <MemoryRouter>
      <SiteHeader />
    </MemoryRouter>
  );
}

describe('responsive site navigation', () => {
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
