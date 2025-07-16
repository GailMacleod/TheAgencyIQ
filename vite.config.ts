import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
plugins: [react(), splitVendorChunkPlugin()],
build: {
chunkSizeWarningLimit: 1000, // Increase to 1MB to reduce warnings
rollupOptions: {
output: {
manualChunks: (id) => {
if (id.includes('node_modules')) {
if (id.includes('react')) return 'vendor-react';
if (id.includes('tanstack')) return 'vendor-tanstack';
if (id.includes('axios')) return 'vendor-axios';
return 'vendor'; // Other vendors
}
},
},
},
},
});
