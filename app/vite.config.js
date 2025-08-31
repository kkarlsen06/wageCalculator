import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // IMPORTANT: run vite in the app/ folder (or set root to 'app' from repo root)
  root: '.',
  base: '/',                   // correct for a subdomain deploy
  server: {
    port: 5173,
    open: false,
    proxy: {
      // DEV-ONLY proxy. In production, call https://server.kkarlsen.dev directly.
      '/api': {
        target: 'https://server.kkarlsen.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      }
    }
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      // SINGLE ENTRY for SPA (remove old kalkulator multi-page inputs)
      input: {
        main: resolve('index.html'),
      },
      output: {
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      }
    }
  }
});