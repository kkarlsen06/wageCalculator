export const API_BASE =
  (import.meta.env?.VITE_API_BASE && import.meta.env.VITE_API_BASE.trim() !== '')
    ? import.meta.env.VITE_API_BASE
    : (import.meta.env?.PROD
         ? '' // prod: same origin, use /api/* in paths
         : (typeof window !== 'undefined' && window.location.hostname === 'localhost'
              ? 'http://localhost:3000' // dev
              : ''));

// optional debug on app boot
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.log('[api] base =', API_BASE, 'prod=', import.meta.env?.PROD);
}

