/** @type {import('tailwindcss').Config} */
// Les anciennes classes orange-* du projet (modes Vision, Audio, Code, TTS,
// Paramètres) sont remappées sur le bleu cobalt de la nouvelle identité.
const cobalt = {
  50: '#eef3ff', 100: '#dde7ff', 200: '#c2d3ff', 300: '#98b4ff', 400: '#6b8cff',
  500: '#3f66ee', 600: '#2a4fd6', 700: '#2140ad', 800: '#1d3688', 900: '#1b2f6b',
}
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: cobalt,
        navy: { 950: '#07070a', 900: '#0b0b0e', 800: '#111115', 700: '#17171c', 600: '#202027', 500: '#2b2b34' },
      },
      fontFamily: {
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in':  'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.2, 0, 0, 1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
