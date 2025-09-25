import { env, isDevelopment } from "@/lib/env";

export type RuntimeFeatureFlags = Record<string, boolean>;
export type RuntimeFeatureConfig = Record<string, unknown>;

export type AppConfig = {
  supabase: {
    url: string;
    anonKey: string;
  };
  apiBase: string;
  apiStreamBase?: string;
  debug: boolean;
  version: string;
  features: RuntimeFeatureConfig;
  flags: RuntimeFeatureFlags;
};

const resolveApiBase = () => {
  const candidate = env.NEXT_PUBLIC_API_URL?.trim();
  if (!candidate) {
    return "/api";
  }
  return candidate;
};

const defaultVersion = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "next-dev";

const baseConfig: AppConfig = {
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  apiBase: resolveApiBase(),
  apiStreamBase: undefined,
  debug: isDevelopment,
  version: defaultVersion,
  features: {},
  flags: {},
};

export const buildBaseRuntimeConfig = (): AppConfig => ({
  ...baseConfig,
  supabase: { ...baseConfig.supabase },
  features: { ...baseConfig.features },
  flags: { ...baseConfig.flags },
});

export const appConfig = buildBaseRuntimeConfig();
