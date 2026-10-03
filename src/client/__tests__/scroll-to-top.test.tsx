import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScrollToTop from '@/components/ScrollToTop';

afterEach(() => vi.restoreAllMocks());

describe('route scrolling', () => {
  it('allows a password recovery token in the URL fragment without throwing', () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    expect(() =>
      render(
        <MemoryRouter initialEntries={[`/reset-password#token=${'a'.repeat(64)}`]}>
          <ScrollToTop />
        </MemoryRouter>
      )
    ).not.toThrow();
    expect(scroll).toHaveBeenCalledWith(0, 0);
  });

  it('scrolls to an encoded element ID', () => {
    const scroll = vi.fn();
    const anchor = document.createElement('section');
    anchor.id = 'pet care';
    anchor.scrollIntoView = scroll;
    document.body.append(anchor);
    try {
      render(
        <MemoryRouter initialEntries={['/#pet%20care']}>
          <ScrollToTop />
        </MemoryRouter>
      );
      expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth' });
    } finally {
      anchor.remove();
    }
  });

  it('handles a malformed encoded fragment without throwing', () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/#%broken']}>
          <ScrollToTop />
        </MemoryRouter>
      )
    ).not.toThrow();
    expect(scroll).toHaveBeenCalledWith(0, 0);
  });
});
