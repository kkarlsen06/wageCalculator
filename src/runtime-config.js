// Runtime configuration loader for the kalkulator bundle
// Reads Vite-provided env vars (VITE_*) at build time and exposes a
// browser-safe runtime config via window.CONFIG for legacy code paths.

const viteSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const viteSupabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const viteApiBase = import.meta.env.VITE_API_BASE;

// Safe defaults (kept for local dev/backwards compatibility)
const defaultConfig = {
  supabase: {
    url: "https://iuwjdacxbirhmsglcbxp.supabase.co",
    anonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2pkYWN4YmlyaG1zZ2xjYnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTIxNDAsImV4cCI6MjA2NDAyODE0MH0.iSjbvGVpM3zOWCGpg5HrQp37PjJCmiHIwVQLgc2LgcE",
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
  apiBase: viteApiBase || defaultConfig.apiBase,
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


