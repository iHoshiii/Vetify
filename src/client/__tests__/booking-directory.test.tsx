import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAllVets } from '../pages/book-appointment/_components/use-all-vets';
import { useProfessionals } from '../hooks/useProfessionals';

vi.mock('../hooks/useProfessionals', () => ({
  useProfessionals: vi.fn(() => ({ data: { pages: 3 }, isPending: false })),
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe('booking directory pagination', () => {
  it('keeps a page selected immediately after opening the directory', () => {
    const { result } = renderHook(() => useAllVets(true));
    act(() => result.current.setPage(2));
    act(() => vi.advanceTimersByTime(1100));
    expect(result.current.page).toBe(2);
  });

  it('resets the page only after a changed search has been debounced', () => {
    const { result } = renderHook(() => useAllVets(true));
    act(() => result.current.setPage(3));
    act(() => result.current.setTerm('Milo'));
    act(() => vi.advanceTimersByTime(999));
    expect(result.current.page).toBe(3);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.page).toBe(1);
    expect(useProfessionals).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'Milo', page: 1 })
    );
  });
});
