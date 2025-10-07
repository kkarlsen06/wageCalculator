import { defineConfig } from 'vite';
import { resolve } from 'path';

// Plugin to fix CSS MIME type in development
function fixCssMimeType() {
  return {
    name: 'fix-css-mime-type',
    configureServer(server) {
      server.middlewares.use('/src/css', (req, res, next) => {
        if (req.url.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
        next();
      });
    }
  };
}

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
  const plugins = [fixCssMimeType()];
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
    resolve: {
      alias: {
        '@': resolve('src')
      }
    },
    css: {
      devSourcemap: true
    },
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
