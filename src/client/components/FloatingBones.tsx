import type { ISourceOptions } from '@tsparticles/engine';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useCallback, useMemo } from 'react';

// Inline paw SVGs, on-palette (primary teal + light accent)
const PAW_TEAL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2316796F'><path d='M12 14c-1.66 0-3 1.34-3 3 0 2 2 3.5 3 3.5s3-1.5 3-3.5c0-1.66-1.34-3-3-3zm-4.5-3.5c-.83 0-1.5.67-1.5 1.5s.5 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm9 0c-.83 0-1.5.67-1.5 1.5s.67 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm-6.75-3c-.69 0-1.25.56-1.25 1.25s.44 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25zm4.5 0c-.69 0-1.25.56-1.25 1.25s.56 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25z'/></svg>";

const PAW_ACCENT =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2355B5C1'><path d='M12 14c-1.66 0-3 1.34-3 3 0 2 2 3.5 3 3.5s3-1.5 3-3.5c0-1.66-1.34-3-3-3zm-4.5-3.5c-.83 0-1.5.67-1.5 1.5s.5 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm9 0c-.83 0-1.5.67-1.5 1.5s.67 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm-6.75-3c-.69 0-1.25.56-1.25 1.25s.44 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25zm4.5 0c-.69 0-1.25.56-1.25 1.25s.56 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25z'/></svg>";

const FloatingBones = () => {
  const particlesInit = useCallback(async (engine: Parameters<typeof loadSlim>[0]) => {
    await loadSlim(engine);
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 60,
      background: { color: { value: 'transparent' } },
      interactivity: {
        events: {
          onHover: { enable: false },
          onClick: { enable: false },
          resize: true,
        },
      },
      particles: {
        number: {
          value: 22,
          density: { enable: true, area: 900 },
        },
        opacity: {
          value: { min: 0.1, max: 0.4 },
          animation: { enable: true, speed: 0.3, minimumValue: 0.08, sync: false },
        },
        shape: {
          type: 'image',
          options: {
            image: [
              { src: PAW_TEAL, width: 32, height: 32 },
              { src: PAW_ACCENT, width: 32, height: 32 },
            ],
          },
        },
        // Static varied angle and size: no spinning, wobble, or pulsing keeps the field calm
        size: { value: { min: 10, max: 20 } },
        rotate: { value: { min: 0, max: 360 }, direction: 'random' },
        move: {
          enable: true,
          speed: { min: 0.2, max: 0.6 },
          direction: 'none',
          random: true,
          straight: false,
          outModes: { default: 'out' },
          attract: { enable: false },
        },
      },
      detectRetina: true,
    }),
    []
  );

  return (
    <ParticlesProvider init={particlesInit}>
      <Particles id="tsparticles" options={options} className="absolute inset-0 z-0" />
    </ParticlesProvider>
  );
};

export default FloatingBones;
