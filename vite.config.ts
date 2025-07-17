import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { visualizer } from "rollup-plugin-visualizer"; // Add for bundle analysis if needed

export default defineConfig(async ({ mode }) => {
  const plugins = [
    react(),
    runtimeErrorOverlay(),
    // Add bundle visualizer in analyze mode for debugging chunk issues
    mode === 'analyze' ? visualizer({ open: true }) : null,
  ].filter(Boolean);

  // Add cartographer plugin conditionally for Replit dev
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined) {
    const cartographerModule = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographerModule.cartographer());
  }

  return {
    plugins,
    base: process.env.NODE_ENV === 'production' ? '/' : '', // Flexible base for Replit deploys
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Keep React together
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              // Group common deps for our app's scale
              if (id.includes('@radix-ui') || id.includes('@tanstack')) {
                return 'ui-vendor';
              }
              if (id.includes('framer-motion') || id.includes('lucide-react')) {
                return 'animation-icons';
              }
              return 'vendor';
            }
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      minify: 'esbuild',
      sourcemap: mode === 'production' ? 'hidden' : true, // Hidden in prod for security, but debuggable
      chunkSizeWarningLimit: 1000, // Bump for our feature-packed app (OAuth, quotas, etc.)
      target: 'es2020',
      cssCodeSplit: true,
      manifest: true, // Generate manifest for better server-side MIME handling
    },
    server: {
      headers: {
        'Content-Type': 'application/javascript', // Force JS MIME in dev to mimic prod fixes
      },
    },
  };
});