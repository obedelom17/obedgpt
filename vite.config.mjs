import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Le bundle principal dépassait 1.4MB : on sépare les grosses
    // dépendances tierces dans leurs propres chunks, mis en cache
    // indépendamment du code de l'app (qui, lui, change souvent).
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-markdown': ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-raw', 'rehype-katex', 'katex'],
          'vendor-highlighter': ['react-syntax-highlighter'],
        },
      },
    },
  },
})
