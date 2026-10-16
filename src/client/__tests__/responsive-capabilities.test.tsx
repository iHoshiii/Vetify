import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import FloatingBones from '../components/FloatingBones';
import { useMedia } from '../pages/call/use-media';

vi.mock('@tsparticles/react', () => ({
  ParticlesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  default: () => <div data-testid="particles" />,
}));
vi.mock('@tsparticles/slim', () => ({ loadSlim: vi.fn() }));

const mediaDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
const canvasDescriptor = Object.getOwnPropertyDescriptor(
  HTMLCanvasElement.prototype,
  'transferControlToOffscreen'
);
afterEach(() => {
  vi.unstubAllGlobals();
  if (mediaDescriptor) Object.defineProperty(navigator, 'mediaDevices', mediaDescriptor);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
  if (canvasDescriptor)
    Object.defineProperty(
      HTMLCanvasElement.prototype,
      'transferControlToOffscreen',
      canvasDescriptor
    );
  else Reflect.deleteProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen');
});

describe('browser capabilities', () => {
  it('keeps the hero usable when offscreen canvas is unsupported', () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    const view = render(<FloatingBones />);
    expect(view.container).toBeEmptyDOMElement();
  });

  it('keeps decorative particles on browsers that support them', () => {
    vi.stubGlobal('OffscreenCanvas', class {});
    Object.defineProperty(HTMLCanvasElement.prototype, 'transferControlToOffscreen', {
      value: vi.fn(),
      configurable: true,
    });
    render(<FloatingBones />);
    expect(screen.getByTestId('particles')).toBeInTheDocument();
  });

  it('returns a call error when media access is unavailable', () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    const { result } = renderHook(useMedia);
    expect(result.current.stream).toBeNull();
    expect(result.current.error).toContain('supported browser over HTTPS');
  });

  it('handles permission denial without throwing', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('Denied')) },
      configurable: true,
    });
    const { result } = renderHook(useMedia);
    await waitFor(() =>
      expect(result.current.error).toBe('We could not reach your camera or microphone.')
    );
  });

  it('releases camera tracks after leaving the call', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      configurable: true,
    });
    const { result, unmount } = renderHook(useMedia);
    await waitFor(() => expect(result.current.stream).toBe(stream));
    unmount();
    expect(stop).toHaveBeenCalledOnce();
  });
});
