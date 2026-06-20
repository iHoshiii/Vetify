'use client';

import type { ISourceOptions } from '@tsparticles/engine';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useCallback, useMemo } from 'react';

const FloatingBones = () => {
  const particlesInit = useCallback(async (engine: any) => {
    // Works instantly! No extra shape package installation required.
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (container: any) => {
    console.log('Particles container loaded', container);
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: { enable: false },
      fpsLimit: 120,
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: 'grab',
          },
          resize: true,
        },
        modes: {
          grab: {
            distance: 120,
            links: {
              opacity: 0.3,
            },
          },
        },
      },
      particles: {
        number: {
          density: {
            enable: false,
          },
          position: { mode: 'uniform' },
          value: 60, // Kept at 60 for seamless animation pacing
        },
        opacity: {
          value: { min: 0.2, max: 0.7 },
        },
        shape: {
          type: 'image', // Uses the native image parser inside the slim engine
          options: {
            image: [
              {
                // Draws a sharp paw print in your brand's deep teal accent color (#0d9488)
                src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23000000"><path d="M12 14c-1.66 0-3 1.34-3 3 0 2 2 3.5 3 3.5s3-1.5 3-3.5c0-1.66-1.34-3-3-3zm-4.5-3.5c-.83 0-1.5.67-1.5 1.5s.5 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm9 0c-.83 0-1.5.67-1.5 1.5s.67 2 1.5 2 1.5-1.17 1.5-2-.67-1.5-1.5-1.5zm-6.75-3c-.69 0-1.25.56-1.25 1.25s.44 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25zm4.5 0c-.69 0-1.25.56-1.25 1.25s.56 1.75 1.25 1.75 1.25-1.06 1.25-1.75-.56-1.25-1.25-1.25z"/></svg>',
                width: 32,
                height: 32,
              },
            ],
          },
        },
        size: {
          value: { min: 12, max: 20 }, // Generates depth with variable sizes
        },
        rotate: {
          value: { min: 0, max: 360 },
          direction: 'random',
          animation: {
            enable: true,
            speed: 1.5, // Smooth, gentle turning as they move
          },
        },
        move: {
          enable: true,
          outModes: {
            default: 'bounce',
          },
          speed: 1.5,
          random: true,
          straight: false,
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
        className="absolute inset-0"
      />
    </ParticlesProvider>
  );
};

export default FloatingBones;
