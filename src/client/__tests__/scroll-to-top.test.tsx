import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScrollToTop from '@/components/ScrollToTop';

afterEach(() => vi.restoreAllMocks());

describe('route scrolling', () => {
  it('allows a password recovery token in the URL fragment without throwing', async () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    expect(() =>
      render(
        <MemoryRouter initialEntries={[`/reset-password#token=${'a'.repeat(64)}`]}>
          <ScrollToTop />
        </MemoryRouter>
      )
    ).not.toThrow();
    await waitFor(() =>
      expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
    );
  });

  it('scrolls to an encoded element ID', async () => {
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
      await waitFor(() => expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth' }));
    } finally {
      anchor.remove();
    }
  });

  it('handles a malformed encoded fragment without throwing', async () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/#%broken']}>
          <ScrollToTop />
        </MemoryRouter>
      )
    ).not.toThrow();
    await waitFor(() =>
      expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
    );
  });

  it('returns the home hero to the top after the header has mounted', async () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const anchor = document.createElement('section');
    anchor.id = 'home';
    anchor.scrollIntoView = vi.fn();
    document.body.append(anchor);
    try {
      render(
        <MemoryRouter initialEntries={['/#home']}>
          <ScrollToTop />
        </MemoryRouter>
      );
      await waitFor(() =>
        expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })
      );
      expect(anchor.scrollIntoView).not.toHaveBeenCalled();
    } finally {
      anchor.remove();
    }
  });
});
