import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/client/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
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
        /**
         * Deep emerald through forest green: the admin console's one palette.
         *
         * A named ramp rather than Tailwind's `emerald`, because the console needs a
         * *muted* green — emerald-600 and below read as a highlighter next to a table
         * of small type, and a console is a surface somebody stares at for an hour.
         * These steps are desaturated toward forest as they darken, which is what
         * keeps a full page of them calm.
         *
         * The ramp is monotone in lightness (3.1:1, 4.9, 7.1, 9.2, 11.8, 15.4 against
         * white from 400 down), so a step can be chosen by the contrast it owes and
         * not by eye:
         *
         *   50   page ground        100  hover wash, header fills
         *   200  borders            300  disabled ink
         *   400  chart mark on dark 500  secondary mark
         *   600  chart series, icons     700  body ink, primary control
         *   800  active state, deepest fill
         *   900  headings
         *
         * 700 and 800 both clear 4.5:1 as ink on the 50 ground and carry white text
         * at 9:1 or better, which is the pair the whole console is built on.
         */
        forest: {
          50: '#f4f8f5',
          100: '#e4efe8',
          200: '#c6dcce',
          300: '#9cc0a9',
          400: '#6b9d80',
          500: '#467c5e',
          600: '#2f6249',
          700: '#245039',
          800: '#1b3e2d',
          900: '#12291f',
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
