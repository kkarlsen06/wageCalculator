import { defineConfig } from 'vite';
import { resolve } from 'path';

// Load PurgeCSS only when available (e.g., local dev) and in production builds.
// In some CI environments (e.g., Netlify workspaces) devDependencies may be omitted
// from the root install, which would otherwise crash the config load.
async function maybeLoadPurgeCss(mode) {
  const isProd = mode === 'production';
  if (!isProd) return null;
  try {
    const mod = await import('vite-plugin-purgecss');
    return mod?.default ?? mod;
  } catch (err) {
    console.warn('[vite] vite-plugin-purgecss not found; skipping CSS purge');
    return null;
  }
}

export default defineConfig(async ({ mode }) => {
  const purgeCss = await maybeLoadPurgeCss(mode);
  const plugins = [];
  if (purgeCss) {
    plugins.push(
      purgeCss({
        content: [
          './index.html',
          './src/**/*.{js,ts,jsx,tsx,vue,html}'
        ],
        safelist: [/^is-/, /^has-/, /^toast-/, /^modal-/, /^swiper-/]
      })
    );
  }

  return {
    plugins,
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
      sourcemap: false,
      rollupOptions: {
        input: resolve('index.html')
      },
      copyPublicDir: true
    }
  };
});
