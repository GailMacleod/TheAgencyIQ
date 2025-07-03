import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'client',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve('client', 'index.html'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve('client', 'src'),
      '@shared': path.resolve('shared'),
      '@assets': path.resolve('attached_assets'),
    },
  },
});