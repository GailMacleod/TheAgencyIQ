
// Vite 6.3.5 Build Optimizations Applied
const vite635BuildConfig = {
  target: 'es2020',
  minify: 'esbuild',
  sourcemap: true,
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom'],
        router: ['wouter'],
        ui: ['@radix-ui/react-dialog'],
        utils: ['date-fns', 'clsx']
      }
    }
  },
  chunkSizeWarningLimit: 1000
};

// Enhanced development server with Vite 6.3.5 features
const vite635DevConfig = {
  hmr: {
    overlay: true,
    clientPort: 5173
  },
  cors: true,
  host: '0.0.0.0',
  strictPort: false,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false
    }
  }
};

export { vite635BuildConfig, vite635DevConfig };
