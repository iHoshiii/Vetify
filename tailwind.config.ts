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
        // Consumer + marketing palette. accent (#55B5C1) is fill/large-decorative only: 2.3:1 on bg fails AA as text, so ink and primary carry all copy.
        vet: {
          bg: '#FAF9F6',
          accent: '#55B5C1',
          primary: '#16796F',
          'primary-dark': '#115C54',
          ink: '#0A0C14',
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
    },
  },
  plugins: [],
};

export default config;
