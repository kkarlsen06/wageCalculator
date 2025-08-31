import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/',
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'https://wageapp-prod.azurewebsites.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        kalkulator: resolve('kalkulator/index.html'),
        login: resolve('kalkulator/login.html'),
        onboarding: resolve('kalkulator/onboarding.html')
      },  
      output: {
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});