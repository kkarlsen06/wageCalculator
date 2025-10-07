// Runtime configuration loader for the kalkulator bundle
// Reads Vite-provided env vars (VITE_*) at build time and exposes a
// browser-safe runtime config via window.CONFIG for legacy code paths.

const viteSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const viteSupabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const viteApiBase = import.meta.env.VITE_API_BASE;
const viteApiStreamBase = import.meta.env.VITE_API_STREAM_BASE;
const isProd = Boolean(import.meta.env && import.meta.env.PROD);
const isLocalHost = (u) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(String(u || ''));
const currentHostname = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '';
const isKkarlsenDomain = /kkarlsen\.dev$/i.test(currentHostname);

// Safe defaults (kept for local dev/backwards compatibility)
const defaultConfig = {
  supabase: {
    url: "https://id.kkarlsen.dev",
    anonKey: "sb_publishable_z9EoG7GZZMS3RL4hmilh5A_xI0va5Nb",
  },
  apiBase: "/api",
  debug: Boolean(import.meta.env && import.meta.env.DEV),
  version: "1.0.0",
};

const resolvedConfig = {
  supabase: {
    url: viteSupabaseUrl || defaultConfig.supabase.url,
    anonKey: viteSupabasePublishableKey || defaultConfig.supabase.anonKey,
  },
  // Prefer explicit VITE_API_BASE when provided and not pointing at localhost in prod.
  // Otherwise, when running on kkarlsen.dev domains in production, default to the API origin
  // to avoid relying on a Netlify /api proxy.
  apiBase: (typeof viteApiBase === 'string' && viteApiBase.trim() !== '' && !(isProd && isLocalHost(viteApiBase)))
    ? viteApiBase
    : (isProd
        ? (isKkarlsenDomain ? 'https://server.kkarlsen.dev' : '/api')
        : defaultConfig.apiBase),
  // Streaming base can be a fully qualified API origin to bypass proxies when needed.
  // Falls back to apiBase when not provided.
  apiStreamBase: (typeof viteApiStreamBase === 'string' && viteApiStreamBase.trim() !== '' && !(isProd && isLocalHost(viteApiStreamBase)))
    ? viteApiStreamBase
    : (isProd && isKkarlsenDomain ? 'https://server.kkarlsen.dev' : undefined),
  debug: defaultConfig.debug,
  version: defaultConfig.version,
};

if (typeof window !== "undefined") {
  window.CONFIG = { ...(window.CONFIG || {}), ...resolvedConfig };

  // Defensive: ensure no server-only secrets are accidentally exposed
  if (window.CONFIG.SUPABASE_SERVICE_ROLE_KEY) {
    delete window.CONFIG.SUPABASE_SERVICE_ROLE_KEY;
    console.warn(
      "Removed server-only SUPABASE_SERVICE_ROLE_KEY from client configuration."
    );
  }
}
