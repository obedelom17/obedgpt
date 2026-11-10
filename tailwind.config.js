/** @type {import('tailwindcss').Config} */
// Thème NEBULA : l'ancienne palette « orange » est remappée sur du violet
// électrique, donc toutes les classes orange-* existantes dans l'app
// (modes Vision, Audio, Code, TTS, Paramètres) adoptent automatiquement
// la nouvelle identité sans les réécrire une par une.
const violet = {
  50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
  500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95',
}
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: violet,
        navy: { 950: '#03040a', 900: '#05060d', 800: '#0b0c1a', 700: '#12122a', 600: '#1b1b3a', 500: '#26264d' },
        nebula: { violet: '#8b5cf6', cyan: '#22d3ee', pink: '#e879f9' },
      },
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px) scale(0.98)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } },
      },
    },
  },
  plugins: [],
}
