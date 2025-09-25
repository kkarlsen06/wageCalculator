import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_API_URL: z.string().url({ message: "NEXT_PUBLIC_API_URL must be a valid URL" }),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsedEnv.success) {
  console.error("[env] Invalid environment variables:", parsedEnv.error.format());
  throw new Error("Environment validation failed. Check .env.local and runtime environment.");
}

export const env = parsedEnv.data;

export const isDevelopment = parsedEnv.data.NODE_ENV === "development";
export const isProduction = parsedEnv.data.NODE_ENV === "production";
export const isTest = parsedEnv.data.NODE_ENV === "test";

export const isBrowser = typeof window !== "undefined";
