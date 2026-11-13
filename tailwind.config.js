/** @type {import('tailwindcss').Config} */
// Les couleurs pointent vers les variables CSS de src/index.css : un seul
// endroit (les tokens) pilote le clair, le sombre et les 4 accents.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--text)', ink2: 'var(--text-2)', ink3: 'var(--text-3)',
        accent: 'var(--accent)', line: 'var(--border)',
        paper: 'var(--bg)', panel: 'var(--surface)', panel2: 'var(--surface-2)',
        danger: 'var(--danger)', warn: 'var(--warn)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        body: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.2, 0, 0, 1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
