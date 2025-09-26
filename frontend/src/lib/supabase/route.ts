import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const supabaseForRoute = () =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name) {
          return cookies().get(name)?.value;
        },
        set(name, value, options) {
          cookies().set(name, value, options);
        },
        remove(name, options) {
          cookies().set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );