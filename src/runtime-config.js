// Runtime configuration loader for the kalkulator bundle
// Reads Vite-provided env vars (VITE_*) at build time and exposes a
// browser-safe runtime config via window.CONFIG for legacy code paths.

const viteSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const viteSupabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const viteApiBase = import.meta.env.VITE_API_BASE;
const isProd = Boolean(import.meta.env && import.meta.env.PROD);
const isLocalHost = (u) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(String(u || ''));

// Safe defaults (kept for local dev/backwards compatibility)
const defaultConfig = {
  supabase: {
    url: "https://your-project-id.supabase.co",
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
  apiBase: (typeof viteApiBase === 'string' && viteApiBase.trim() !== '' && !(isProd && isLocalHost(viteApiBase)))
    ? viteApiBase
    : (isProd ? '/api' : defaultConfig.apiBase),
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


