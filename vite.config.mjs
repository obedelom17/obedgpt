import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // jsxImportSource : le JSX passe par src/i18n/jsx-runtime.js, qui traduit les
  // textes affichés quand l'interface est en anglais (zéro changement dans les composants).
  plugins: [react({ jsxImportSource: 'obedgpt-i18n' })],
  resolve: { alias: { 'obedgpt-i18n': fileURLToPath(new URL('./src/i18n', import.meta.url)) } },
  build: {
    // React est isolé (mis en cache). Markdown, KaTeX et la coloration de code restent
    // des chunks asynchrones : chargés au premier message seulement.
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
  },
})
