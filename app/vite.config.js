import { defineConfig } from 'vite';
import { resolve } from 'path';
import purgeCss from "vite-plugin-purgecss";

export default defineConfig({
  plugins: [purgeCss({
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx,vue,html}"
    ],
    safelist: [/^is-/, /^has-/, /^toast-/, /^modal-/, /^swiper-/] // tweak as needed
  })],
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
    },
    copyPublicDir: true // Ensure service worker is copied to dist
  }
});
