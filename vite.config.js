import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
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
        main: resolve(__dirname, 'index.html'),
        kalkulator: resolve(__dirname, 'kalkulator/index.html'),
        login: resolve(__dirname, 'kalkulator/login.html')
      }
    }
  }
});


