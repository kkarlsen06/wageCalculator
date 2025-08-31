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
  build: {
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        login: resolve('login.html'),
        onboarding: resolve('onboarding.html')
      }
    }
  }
});