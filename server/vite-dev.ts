import { createServer } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export async function createViteDevServer(app: any) {
  try {
    const vite = await createServer({
      configFile: false,
      root: resolve(process.cwd(), 'client'),
      server: {
        middlewareMode: true,
        hmr: {
          port: 3001,
        },
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': resolve(process.cwd(), 'client/src'),
          '@shared': resolve(process.cwd(), 'shared'),
          '@assets': resolve(process.cwd(), 'attached_assets'),
        },
      },
      build: {
        outDir: resolve(process.cwd(), 'dist'),
        rollupOptions: {
          input: resolve(process.cwd(), 'client/index.html'),
        },
      },
    });

    app.use(vite.ssrFixStacktrace);
    app.use(vite.middlewares);
    
    console.log('✅ Vite development server initialized successfully');
    return vite;
  } catch (error) {
    console.error('❌ Failed to create Vite server:', error);
    throw error;
  }
}