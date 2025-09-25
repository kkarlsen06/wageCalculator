"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type PropsWithChildren,
} from "react";
import {
  appConfig as initialConfig,
  buildBaseRuntimeConfig,
  type AppConfig,
} from "@/lib/config";
import { apiClient } from "@/lib/api";
import { useAppStore } from "@/lib/stores/app-store";

type ConfigStatus = "idle" | "loading" | "ready" | "error";

type RemoteRuntimeConfig = Partial<AppConfig> & {
  features?: Record<string, unknown>;
  flags?: Record<string, boolean>;
};

type RuntimeConfigContextValue = {
  config: AppConfig;
  status: ConfigStatus;
  error: Error | null;
  refresh: () => Promise<void>;
};

type WindowConfig = Partial<AppConfig> & Record<string, unknown>;

declare global {
  interface Window {
    CONFIG?: WindowConfig;
  }
}

const ConfigContext = createContext<RuntimeConfigContextValue | undefined>(
  undefined,
);

const mergeRuntimeConfig = (
  base: AppConfig,
  remote?: RemoteRuntimeConfig | null,
): AppConfig => {
  if (!remote) {
    return {
      ...base,
      supabase: { ...base.supabase },
      features: { ...base.features },
      flags: { ...base.flags },
    };
  }

  const supabase = {
    url: remote.supabase?.url?.trim() || base.supabase.url,
    anonKey: remote.supabase?.anonKey?.trim() || base.supabase.anonKey,
  };

  const features: Record<string, unknown> = {
    ...base.features,
    ...(remote.features ?? {}),
  };

  const flags: Record<string, boolean> = {
    ...base.flags,
    ...(remote.flags ?? {}),
  };

  return {
    ...base,
    apiBase: remote.apiBase?.trim() || base.apiBase,
    apiStreamBase:
      remote.apiStreamBase?.trim() || base.apiStreamBase || undefined,
    debug:
      typeof remote.debug === "boolean" ? remote.debug : base.debug,
    version: remote.version?.toString() || base.version,
    supabase,
    features,
    flags,
  };
};

const coerceRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const coerceBooleanFlags = (value: unknown): Record<string, boolean> =>
  Object.fromEntries(
    Object.entries(coerceRecord(value)).map(([key, raw]) => [
      key,
      Boolean(raw),
    ]),
  );

const applyGlobalRuntimeConfig = (config: AppConfig) => {
  if (typeof window === "undefined") {
    return;
  }

  const nextConfig: WindowConfig = {
    apiBase: config.apiBase,
    apiStreamBase: config.apiStreamBase,
    debug: config.debug,
    version: config.version,
    supabase: { ...config.supabase },
    features: { ...config.features },
    flags: { ...config.flags },
  };

  const existing = coerceRecord(window.CONFIG);
  const existingFeatures = coerceRecord(existing.features);
  const existingFlags = coerceBooleanFlags(existing.flags);
  const nextFlags = coerceBooleanFlags(nextConfig.flags);

  const merged: WindowConfig = {
    ...existing,
    ...nextConfig,
    features: {
      ...existingFeatures,
      ...nextConfig.features,
    },
    flags: {
      ...existingFlags,
      ...nextFlags,
    },
  };

  if ("SUPABASE_SERVICE_ROLE_KEY" in merged) {
    delete merged.SUPABASE_SERVICE_ROLE_KEY;
  }

  window.CONFIG = merged;
};

export const ConfigProvider = ({
  children,
}: PropsWithChildren): JSX.Element => {
  const baseConfig = useMemo(() => buildBaseRuntimeConfig(), []);
  const [config, setConfig] = useState<AppConfig>(baseConfig);
  const [status, setStatus] = useState<ConfigStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const setLastConfigSync = useAppStore((state) => state.setLastConfigSync);

  const applyConfig = useCallback(
    (next: AppConfig) => {
      setConfig(next);
      applyGlobalRuntimeConfig(next);
      apiClient.setBaseUrl(next.apiBase);
      apiClient.setLoggingEnabled(Boolean(next.debug));
    },
    [],
  );

  const loadRemoteConfig = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/config", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Config request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as RemoteRuntimeConfig;
      const merged = mergeRuntimeConfig(baseConfig, payload);
      applyConfig(merged);
      setStatus("ready");
      setLastConfigSync(new Date().toISOString());
    } catch (err) {
      console.warn("[config] using fallback runtime config", err);
      applyConfig(baseConfig);
      setStatus("error");
      setError(err as Error);
      setLastConfigSync(null);
    }
  }, [applyConfig, baseConfig, setLastConfigSync]);

  useEffect(() => {
    applyConfig(initialConfig);
    void loadRemoteConfig();
  }, [applyConfig, loadRemoteConfig]);

  const value = useMemo<RuntimeConfigContextValue>(
    () => ({
      config,
      status,
      error,
      refresh: loadRemoteConfig,
    }),
    [config, error, loadRemoteConfig, status],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useRuntimeConfig = (): RuntimeConfigContextValue => {
  const context = useContext(ConfigContext);

  if (!context) {
    throw new Error("useRuntimeConfig must be used within a ConfigProvider");
  }

  return context;
};
