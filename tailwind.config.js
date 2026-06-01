/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#1C1917',
          900: '#FFFBF7',
          800: '#FFFFFF',
          700: '#FFF7ED',
          600: '#FFEDD5',
          500: '#FED7AA',
        },
        amber: {
          300: '#FB923C',
          400: '#F97316',
          500: '#EA580C',
          600: '#C2410C',
        },
        surface: {
          DEFAULT: '#FFF7ED',
          raised: '#FFFFFF',
          border: '#FDE8D0',
        }
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-amber': '0 0 20px rgba(234, 88, 12, 0.25)',
        'glow-sm':    '0 0 10px rgba(234, 88, 12, 0.12)',
        'card':       '0 2px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(253,232,208,0.8)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow':       'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        glow:    { from: { boxShadow: '0 0 10px rgba(234,88,12,0.15)' }, to: { boxShadow: '0 0 25px rgba(234,88,12,0.4)' } }
      }
    },
  },
  plugins: [],
}
