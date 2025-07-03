import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Minimal Vite config without Replit plugins for production builds
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@lib': path.resolve(__dirname, 'client/src/lib'),
      '@components': path.resolve(__dirname, 'client/src/components'),
      '@hooks': path.resolve(__dirname, 'client/src/hooks'),
    },
  },
  root: 'client',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: 'client/index.html',
    },
  },
  server: {
    port: 3000,
  },
});