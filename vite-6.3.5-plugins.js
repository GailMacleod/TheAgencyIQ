
// Enhanced Plugin System for Vite 6.3.5
import react from '@vitejs/plugin-react';

export const vite635Plugins = [
  react({
    jsxRuntime: 'automatic',
    jsxImportSource: 'react',
    babel: {
      plugins: [
        ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
      ]
    }
  }),
  
  // Enhanced error overlay
  {
    name: 'vite-6.3.5-error-overlay',
    configureServer(server) {
      server.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    }
  },
  
  // Enhanced HMR
  {
    name: 'vite-6.3.5-hmr',
    handleHotUpdate(ctx) {
      console.log('HMR update for:', ctx.file);
    }
  }
];
