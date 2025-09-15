import { createClient } from '@supabase/supabase-js';

const SUPABASE_DEFAULTS = {
  url: 'https://id.kkarlsen.dev',
  anonKey: 'sb_publishable_z9EoG7GZZMS3RL4hmilh5A_xI0va5Nb'
};

function resolveSupabaseConfig() {
  const envUrl = import.meta.env?.VITE_SUPABASE_URL;
  const envAnonKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;

  const runtimeConfigSupabase = typeof globalThis !== 'undefined'
    ? globalThis.CONFIG?.supabase
    : undefined;

  const url = envUrl || runtimeConfigSupabase?.url || SUPABASE_DEFAULTS.url;
  const anonKey = envAnonKey || runtimeConfigSupabase?.anonKey || SUPABASE_DEFAULTS.anonKey;

  return {
    url,
    anonKey,
    source: envUrl || envAnonKey
      ? 'env'
      : runtimeConfigSupabase
        ? 'runtime-config'
        : 'defaults'
  };
}

const { url: resolvedUrl, anonKey: resolvedAnonKey, source } = resolveSupabaseConfig();

export const supabase = createClient(resolvedUrl, resolvedAnonKey);

try {
  const mask = (s) => {
    if (!s) return '';
    const str = String(s);
    if (str.length <= 8) return str[0] + '…' + str[str.length - 1];
    return str.slice(0, 4) + '…' + str.slice(-4);
  };
  const host = (() => {
    try {
      return new URL(resolvedUrl).host;
    } catch (_) {
      return resolvedUrl;
    }
  })();
  console.log(
    `[boot] supabase client source=${source} url=${host} key=${mask(resolvedAnonKey)}`
  );
} catch (_) {}

