import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
      keyframes: {
        /* Gradient text shimmer */
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        /* Blob float variants */
        blobFloat1: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-50px) scale(1.05)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.97)' },
        },
        blobFloat2: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(-40px,30px) scale(1.08)' },
          '66%': { transform: 'translate(25px,-30px) scale(0.95)' },
        },
        blobFloat3: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(20px,-40px) scale(1.04)' },
        },
        /* Scroll bounce */
        scrollBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(6px)' },
        },
        /* Card shimmer */
        shimmer: {
          from: { transform: 'translateX(-100%) skewX(-15deg)' },
          to: { transform: 'translateX(200%) skewX(-15deg)' },
        },
        /* Fade up (generic) */
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'gradient-shift': 'gradientShift 6s ease infinite',
        'blob-1': 'blobFloat1 18s ease-in-out infinite',
        'blob-2': 'blobFloat2 22s ease-in-out infinite',
        'blob-3': 'blobFloat3 14s ease-in-out infinite',
        'scroll-bounce': 'scrollBounce 1.4s ease-in-out infinite',
        shimmer: 'shimmer 0.55s ease-in-out',
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
      },
      // Custom shadow tokens
      boxShadow: {
        'glow-teal': '0 0 20px 0 rgba(13,148,136,0.35)',
        'glow-blue': '0 0 20px 0 rgba(37,99,235,0.35)',
      },
      // Extra backdrop blur stop
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
