import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '',
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
        login: resolve('kalkulator/login.html')
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name.startsWith('kalkulator') || chunk.name === 'login'
            ? 'kalkulator/[name]-[hash].js'
            : '[name]-[hash].js',
        chunkFileNames: (chunk) =>
          chunk.facadeModuleId?.includes('/kalkulator/')
            ? 'kalkulator/chunks/[name]-[hash].js'
            : 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) =>
          assetInfo.name && assetInfo.name.includes('kalkulator')
            ? 'kalkulator/assets/[name]-[hash][extname]'
            : 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          if (id.includes('/kalkulator/')) {
            return 'kalkulator-shared';
          }
        }
      }
    }
  }
});