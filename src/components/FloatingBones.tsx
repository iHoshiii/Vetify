'use client';

import type { ISourceOptions } from '@tsparticles/engine';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useCallback, useMemo } from 'react';

const FloatingBones = () => {
  const particlesInit = useCallback(async (engine: any) => {
    await loadSlim(engine);
  }, []);

  const particlesLoaded = useCallback(async (container: any) => {
    console.log('Particles container loaded', container);
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fpsLimit: 120,
      particles: {
        color: {
          value: ['#cbd5e1', '#e2e8f0', '#94a3b8'],
        },
        number: {
          density: {
            enable: true,
          },
          value: 25,
        },
        opacity: {
          value: { min: 0.1, max: 0.35 },
        },
        rotate: {
          value: { min: -20, max: 20 },
          direction: 'random',
          animation: {
            enable: true,
            speed: 1,
          },
        },
        shape: {
          type: 'circle',
        },
        size: {
          value: { min: 12, max: 24 },
        },
        move: {
          direction: 'top',
          enable: true,
          outModes: {
            default: 'out',
          },
          random: true,
          speed: 1,
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
        className="absolute inset-0 z-5"
      />
    </ParticlesProvider>
  );
};

export default FloatingBones;
