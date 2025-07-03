import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// MINIMAL VITE CONFIG - BYPASSES REPLIT PLUGIN ISSUES
export default defineConfig({
  plugins: [react()],
  root: './client',
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
      '@assets': resolve(__dirname, './attached_assets'),
      '@/lib': resolve(__dirname, './client/src/lib'),
      '@/components': resolve(__dirname, './client/src/components'),
      '@/hooks': resolve(__dirname, './client/src/hooks'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true
  }
})