'use client';

import type { ISourceOptions } from '@tsparticles/engine';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useCallback, useMemo } from 'react';

// SVG encoded inline — teal paw print + blue paw print
const PAW_TEAL =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230d9488'><path d='M12 14c-1.66 0-3 1.34-3 3 0 2 2 3.5 3 3.5s3-1.5 3-3.5c0-1.66-1.34-3-3-3zm-4.5-3.5c-.83 0-1.5.67-1.5 1.5s.5 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm9 0c-.83 0-1.5.67-1.5 1.5s.67 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm-6.75-3c-.69 0-1.25.56-1.25 1.25s.44 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25zm4.5 0c-.69 0-1.25.56-1.25 1.25s.56 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25z'/></svg>";

const PAW_BLUE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563eb'><path d='M12 14c-1.66 0-3 1.34-3 3 0 2 2 3.5 3 3.5s3-1.5 3-3.5c0-1.66-1.34-3-3-3zm-4.5-3.5c-.83 0-1.5.67-1.5 1.5s.5 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm9 0c-.83 0-1.5.67-1.5 1.5s.67 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm-6.75-3c-.69 0-1.25.56-1.25 1.25s.44 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25zm4.5 0c-.69 0-1.25.56-1.25 1.25s.56 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25z'/></svg>";

const PAW_INDIGO =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234f46e5'><path d='M12 14c-1.66 0-3 1.34-3 3 0 2 2 3.5 3 3.5s3-1.5 3-3.5c0-1.66-1.34-3-3-3zm-4.5-3.5c-.83 0-1.5.67-1.5 1.5s.5 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm9 0c-.83 0-1.5.67-1.5 1.5s.67 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm-6.75-3c-.69 0-1.25.56-1.25 1.25s.44 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25zm4.5 0c-.69 0-1.25.56-1.25 1.25s.56 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25z'/></svg>";

const FloatingBones = () => {
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (_container: any) => {
    // loaded
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 60,
      background: { color: { value: 'transparent' } },
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: ['grab', 'bubble'],
          },
          onClick: { enable: true, mode: 'push' },
          resize: true,
        },
        modes: {
          grab: {
            distance: 140,
            links: { opacity: 0.25, color: '#0d9488' },
          },
          bubble: {
            distance: 160,
            size: 24,
            duration: 0.4,
            opacity: 0.85,
          },
          push: { quantity: 2 },
        },
      },
      particles: {
        number: {
          value: 55,
          density: { enable: true, area: 900 },
        },
        opacity: {
          value: { min: 0.15, max: 0.55 },
          animation: {
            enable: true,
            speed: 0.6,
            minimumValue: 0.1,
            sync: false,
          },
        },
        shape: {
          type: 'image',
          options: {
            image: [
              { src: PAW_TEAL, width: 32, height: 32 },
              { src: PAW_BLUE, width: 32, height: 32 },
              { src: PAW_INDIGO, width: 32, height: 32 },
            ],
          },
        },
        size: {
          value: { min: 10, max: 22 },
          animation: {
            enable: true,
            speed: 1.2,
            minimumValue: 8,
            sync: false,
          },
        },
        rotate: {
          value: { min: 0, max: 360 },
          direction: 'random',
          animation: { enable: true, speed: 2, sync: false },
        },
        move: {
          enable: true,
          speed: { min: 0.6, max: 1.8 },
          direction: 'none',
          random: true,
          straight: false,
          outModes: { default: 'bounce' },
          attract: { enable: false },
        },
        // Subtle wobble via tilt
        tilt: {
          enable: true,
          value: { min: -20, max: 20 },
          animation: { enable: true, speed: 3, sync: false },
        },
      },
      detectRetina: true,
    }),
    []
  );

  return (
    <ParticlesProvider init={particlesInit}>
      <Particles
        id="tsparticles"
        particlesLoaded={particlesLoaded}
        options={options}
        className="absolute inset-0 z-0"
      />
    </ParticlesProvider>
  );
};

export default FloatingBones;
