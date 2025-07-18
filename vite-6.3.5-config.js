// Vite 6.3.5 Configuration for TheAgencyIQ
// This configuration aligns with Vite v6.3.5 features and improvements

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Vite 6.3.5 plugins with enhanced React support
  plugins: [
    react({
      // Enhanced React plugin configuration for Vite 6.3.5
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    }),
    // Enhanced runtime error overlay for development
    ...(process.env.NODE_ENV !== 'production' ? [
      {
        name: 'runtime-error-overlay',
        configureServer(server) {
          server.ws.on('error', (error) => {
            console.error('WebSocket error:', error)
          })
        }
      }
    ] : [])
  ],

  // Enhanced resolve configuration for Vite 6.3.5
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
      '@components': path.resolve(__dirname, 'client/src/components'),
      '@lib': path.resolve(__dirname, 'client/src/lib'),
      '@utils': path.resolve(__dirname, 'client/src/utils'),
      '@pages': path.resolve(__dirname, 'client/src/pages'),
      '@hooks': path.resolve(__dirname, 'client/src/hooks')
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  },

  // Enhanced root configuration
  root: path.resolve(__dirname, 'client'),

  // Enhanced build configuration for Vite 6.3.5
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'es2020',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['wouter'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    // Enhanced chunk size warnings
    chunkSizeWarningLimit: 1000
  },

  // Enhanced server configuration for Vite 6.3.5
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    },
    fs: {
      strict: true,
      deny: ['**/.*', '**/node_modules/**']
    },
    // Enhanced HMR configuration
    hmr: {
      overlay: true,
      clientPort: 5173
    }
  },

  // Enhanced CSS configuration
  css: {
    postcss: {
      plugins: []
    },
    modules: {
      localsConvention: 'camelCase'
    }
  },

  // Enhanced define configuration
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },

  // Enhanced optimizeDeps configuration for Vite 6.3.5
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'wouter',
      '@tanstack/react-query',
      '@hookform/resolvers/zod',
      'react-hook-form',
      'zod',
      'clsx',
      'tailwind-merge',
      'date-fns',
      'lucide-react'
    ],
    exclude: ['@replit/vite-plugin-cartographer']
  },

  // Enhanced esbuild configuration
  esbuild: {
    target: 'es2020',
    jsx: 'automatic',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment'
  },

  // Enhanced logging
  logLevel: 'info',

  // Enhanced environment configuration
  envPrefix: 'VITE_',

  // Enhanced experimental features for Vite 6.3.5
  experimental: {
    renderBuiltUrl: (filename) => {
      return `/${filename}`
    }
  }
})