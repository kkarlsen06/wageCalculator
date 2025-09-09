// app/vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://server.kkarlsen.dev',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/api/, '')
      }
    }
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://server.kkarlsen.dev',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/api/, '')
      }
    }
  },
  build: {
    sourcemap: false, // Disable source maps in production to prevent 403 errors
    rollupOptions: {
      input: resolve('index.html')
    }
  }
});
