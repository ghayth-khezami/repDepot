/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        lavender: {
          50: '#faf5ff',
          100: '#f3e8ff',
          600: '#9f7aea',
          700: '#805ad5',
          800: '#6b46c1',
        },
      },
      padding: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      },
    },
  },
  plugins: [],
};
