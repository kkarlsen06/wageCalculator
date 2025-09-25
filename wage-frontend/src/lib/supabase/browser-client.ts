"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { env } from "@/lib/env";

let browserClient: ReturnType<typeof createClientComponentClient> | null = null;

export const getBrowserSupabaseClient = () => {
  if (!browserClient) {
    browserClient = createClientComponentClient({
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
  }

  return browserClient;
};
