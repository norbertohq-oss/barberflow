/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#070707',
          900: '#0b0b0b',
          850: '#101010',
          800: '#151515',
          700: '#202020',
        },
        gold: {
          300: '#f0d06a',
          400: '#d7b64f',
          500: '#c69d2d',
          700: '#6f5522',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(215, 182, 79, 0.2), 0 20px 80px rgba(0,0,0,.35)',
      },
    },
  },
  plugins: [],
};
