import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // jsxImportSource : le JSX passe par src/i18n/jsx-runtime.js, qui traduit les
  // textes affichés quand l'interface est en anglais (zéro changement dans les composants).
  plugins: [react({ jsxImportSource: 'obedgpt-i18n' })],
  resolve: { alias: { 'obedgpt-i18n': fileURLToPath(new URL('./src/i18n', import.meta.url)) } },
  build: {
    // Le bundle principal dépassait 1.4MB : on sépare les grosses
    // dépendances tierces dans leurs propres chunks, mis en cache
    // indépendamment du code de l'app (qui, lui, change souvent).
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-raw', 'rehype-sanitize', 'rehype-katex', 'katex'],
          'vendor-highlighter': ['react-syntax-highlighter'],
        },
      },
    },
  },
})
