"use client";

import { appConfig } from "@/lib/config";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ApiError } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

export type ApiRequestConfig = {
  path: string;
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: HeadersInit;
  body?: unknown;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
};

type RequestInterceptor = (
  config: ApiRequestConfig,
) => Promise<ApiRequestConfig> | ApiRequestConfig;

type ResponseInterceptor = (
  response: Response,
  config: ApiRequestConfig,
) => Promise<Response> | Response;

type ApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () =>
    | string
    | null
    | undefined
    | Promise<string | null | undefined>;
  enableLogging?: boolean;
};

type ParsedBody<T> = {
  data: T;
  response: Response;
};

const buildUrl = (
  baseUrl: string,
  path: string,
  query?: ApiRequestConfig["query"],
): string => {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;

  if (!query || Object.keys(query).length === 0) {
    return url;
  }

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    searchParams.append(key, String(value));
  });

  const separator = url.includes("?") ? "&" : "?";
  const queryString = searchParams.toString();

  return queryString ? `${url}${separator}${queryString}` : url;
};

const maybeSerialiseBody = (body: unknown, headers: Headers): BodyInit | null => {
  if (body === null || body === undefined) {
    return null;
  }

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams
  ) {
    return body;
  }

  if (typeof body === "string") {
    return body;
  }

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return JSON.stringify(body);
};

const parseResponse = async <T>(response: Response): Promise<ParsedBody<T>> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as T;
    return { data, response };
  }

  const textPayload = (await response.text()) as unknown as T;
  return { data: textPayload, response };
};

export class ApiClient {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private baseUrl: string;
  private readonly resolveAccessToken?: ApiClientOptions["getAccessToken"];
  private loggingEnabled: boolean;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
    this.resolveAccessToken = options.getAccessToken;
    this.loggingEnabled = Boolean(options.enableLogging);
  }

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  setLoggingEnabled(enabled: boolean) {
    this.loggingEnabled = enabled;
  }

  isLoggingEnabled() {
    return this.loggingEnabled;
  }

  useRequest(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
    return () => {
      this.requestInterceptors = this.requestInterceptors.filter(
        (current) => current !== interceptor,
      );
    };
  }

  useResponse(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
    return () => {
      this.responseInterceptors = this.responseInterceptors.filter(
        (current) => current !== interceptor,
      );
    };
  }

  async request<TResponse>(initialConfig: ApiRequestConfig): Promise<TResponse> {
    const configWithDefaults: ApiRequestConfig = {
      method: "GET",
      ...initialConfig,
    };

    const config = await this.applyRequestInterceptors(configWithDefaults);
    const url = buildUrl(this.baseUrl, config.path, config.query);
    const headers = new Headers(config.headers ?? {});
    const method = config.method ?? "GET";

    const body =
      method === "GET" || method === "HEAD"
        ? null
        : maybeSerialiseBody(config.body, headers);

    const response = await fetch(url, {
      method,
      headers,
      body: body ?? undefined,
      signal: config.signal,
      credentials: config.credentials,
    });

    const interceptedResponse = await this.applyResponseInterceptors(
      response,
      config,
    );

    if (!interceptedResponse.ok) {
      const clone = interceptedResponse.clone();
      const { data } = await parseResponse<unknown>(clone);
      const message =
        typeof data === "object" && data && "error" in (data as Record<string, unknown>)
          ? String((data as Record<string, unknown>).error)
          : interceptedResponse.statusText || "Request failed";

      throw new ApiError(message, interceptedResponse.status, url, data);
    }

    const { data } = await parseResponse<TResponse>(
      interceptedResponse.clone(),
    );

    return data;
  }

  private async applyRequestInterceptors(
    config: ApiRequestConfig,
  ): Promise<ApiRequestConfig> {
    let nextConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      nextConfig = await interceptor(nextConfig);
    }

    if (this.resolveAccessToken) {
      const token = await this.resolveAccessToken();
      if (token) {
        const headers = new Headers(nextConfig.headers ?? {});
        if (!headers.has("authorization")) {
          headers.set("authorization", `Bearer ${token}`);
        }
        nextConfig = {
          ...nextConfig,
          headers,
        };
      }
    }

    return nextConfig;
  }

  private async applyResponseInterceptors(
    response: Response,
    config: ApiRequestConfig,
  ): Promise<Response> {
    let nextResponse = response;

    for (const interceptor of this.responseInterceptors) {
      nextResponse = await interceptor(nextResponse, config);
    }

    return nextResponse;
  }
}

const getAccessToken = async () =>
  useAuthStore.getState().session?.access_token ?? null;

const defaultClient = new ApiClient({
  baseUrl: appConfig.apiBase,
  getAccessToken,
  enableLogging: appConfig.debug,
});

defaultClient.useRequest(async (config) => {
  const headers = new Headers(config.headers ?? {});

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  return {
    ...config,
    headers,
  };
});

defaultClient.useResponse(async (response) => {
  if (response.status === 401) {
    useAuthStore.getState().setStatus("unauthenticated");
  }

  if (defaultClient.isLoggingEnabled()) {
    console.info("[api] response", {
      status: response.status,
      ok: response.ok,
      url: response.url,
    });
  }

  return response;
});

export const apiClient = defaultClient;
