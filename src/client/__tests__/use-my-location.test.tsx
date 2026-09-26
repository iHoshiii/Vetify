import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMyLocation } from '../hooks/use-my-location';

describe('the nearby-vet location request', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks for a quick recent fix instead of waiting for precise GPS', () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });
    const { result } = renderHook(() => useMyLocation());

    act(() => result.current.ask());

    expect(result.current.status).toBe('asking');
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        enableHighAccuracy: false,
        maximumAge: 300_000,
        timeout: 7_000,
      })
    );
  });
});
