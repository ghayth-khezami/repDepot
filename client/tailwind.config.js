import defaultTheme from 'tailwindcss/defaultTheme';

/** Bébé-Dépôt design tokens live in src/index.css (:root CSS variables).
 *  Tailwind only maps names → variables so every screen shares one source of truth. */
const token = (name) => `rgb(var(--bd-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        bd: {
          bg: token('bg'),
          surface: token('surface'),
          ink: token('ink'),
          muted: token('muted'),
          lilac: token('lilac'),
          blush: token('blush'),
          line: token('line'),
          pink: token('pink'),
          'pink-strong': token('pink-strong'),
          violet: token('violet'),
          'violet-strong': token('violet-strong'),
          amber: token('amber'),
          'amber-ink': token('amber-ink'),
          success: token('success'),
          'success-bg': token('success-bg'),
          danger: token('danger'),
          'danger-bg': token('danger-bg'),
        },
        primary: {
          50: '#fff1f6',
          100: '#ffe4ef',
          200: '#fecddf',
          300: '#fda4c4',
          400: '#fb729f',
          500: '#ec4f83',
          600: '#db356d',
          700: '#b92759',
          800: '#98234f',
          900: '#7d2045',
        },
        secondary: {
          50: '#fef3c7',
          100: '#fde68a',
          200: '#fcd34d',
          300: '#fbbf24',
          400: '#f59e0b',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        lavender: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#b794f6',
          600: '#9f7aea',
          700: '#805ad5',
          800: '#6b46c1',
          900: '#553c9a',
        },
        peach: {
          50: '#fff5f5',
          100: '#fed7d7',
          200: '#feb2b2',
          300: '#fc8181',
          400: '#f56565',
          500: '#e53e3e',
          600: '#c53030',
          700: '#9b2c2c',
          800: '#742a2a',
          900: '#63171b',
        },
      },
      borderRadius: {
        card: '24px',
      },
      boxShadow: {
        card: 'var(--bd-shadow-card)',
        'glow-pink': 'var(--bd-glow-pink)',
        'glow-violet': 'var(--bd-glow-violet)',
      },
      backgroundImage: {
        // Decorative (icons on top, no body text): spec colours.
        'grad-pink': 'var(--bd-grad-pink)',
        'grad-violet': 'var(--bd-grad-violet)',
        'grad-amber': 'var(--bd-grad-amber)',
        'grad-purple': 'var(--bd-grad-purple)',
        'grad-rose': 'var(--bd-grad-rose)',
        'grad-green': 'var(--bd-grad-green)',
        'grad-gray': 'var(--bd-grad-gray)',
        // Text-bearing (buttons, active pills): darker stops so white text stays ≥ 4.5:1.
        'grad-pink-strong': 'var(--bd-grad-pink-strong)',
        'grad-violet-strong': 'var(--bd-grad-violet-strong)',
        'grad-green-strong': 'var(--bd-grad-green-strong)',
        'grad-brand': 'var(--bd-grad-brand)',
      },
      transitionDuration: {
        DEFAULT: '180ms',
      },
    },
  },
  plugins: [],
}
