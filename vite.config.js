import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // GitHub Pages deploys to /rafiki/ subdirectory
  // Set this to '/' if using a custom domain
  base: '/',

  build: {
    outDir: 'dist',
  },
})
