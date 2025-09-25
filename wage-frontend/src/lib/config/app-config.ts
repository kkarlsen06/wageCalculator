import { env, isDevelopment, isProduction } from "@/lib/env";

type ApiRetryPolicy = {
  attempts: number;
  backoffMs: number;
};

type FeatureFlags = {
  enableVerboseLogging: boolean;
  enableOfflinePersistence: boolean;
};

export type AppConfig = {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  retryPolicy: ApiRetryPolicy;
  features: FeatureFlags;
};

const baseConfig: AppConfig = {
  apiBaseUrl: env.NEXT_PUBLIC_API_URL,
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  retryPolicy: {
    attempts: 3,
    backoffMs: 250,
  },
  features: {
    enableVerboseLogging: false,
    enableOfflinePersistence: true,
  },
};

const developmentOverrides: Partial<AppConfig> = {
  retryPolicy: {
    attempts: 1,
    backoffMs: 100,
  },
  features: {
    enableVerboseLogging: true,
    enableOfflinePersistence: true,
  },
};

const productionOverrides: Partial<AppConfig> = {
  retryPolicy: {
    attempts: 3,
    backoffMs: 300,
  },
  features: {
    enableVerboseLogging: false,
    enableOfflinePersistence: true,
  },
};

const overrides = isDevelopment
  ? developmentOverrides
  : isProduction
    ? productionOverrides
    : undefined;

export const appConfig: AppConfig = {
  ...baseConfig,
  ...(overrides ?? {}),
  retryPolicy: {
    ...baseConfig.retryPolicy,
    ...(overrides?.retryPolicy ?? {}),
  },
  features: {
    ...baseConfig.features,
    ...(overrides?.features ?? {}),
  },
};
