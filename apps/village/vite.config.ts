import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'src/client'),
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
  },
  server: {
    port: 3701,
    proxy: {
      '/events': {
        target: 'http://localhost:3700',
        changeOrigin: true,
      },
      '/playlist': {
        target: 'http://localhost:3700',
        changeOrigin: true,
      },
      '/status': {
        target: 'http://localhost:3700',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:3700',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://localhost:3700',
        changeOrigin: true,
      },
      '/terrarium': {
        target: 'http://localhost:3700',
        changeOrigin: true,
      },
    },
  },
});
