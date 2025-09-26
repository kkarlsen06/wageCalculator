import { createBrowserClient } from "@supabase/ssr";
import type { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;
let listenerBound = false;

const persistSession = async (event: AuthChangeEvent, session: Session | null) => {
  try {
    await fetch("/auth/callback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ event, session }),
    });
  } catch (error) {
    console.warn("[auth] failed to persist session", error);
  }
};

function bindAuthListener(client: SupabaseClient) {
  if (listenerBound || typeof window === "undefined") return;
  listenerBound = true;
  client.auth.onAuthStateChange(async (event, session) => {
    await persistSession(event, session);
  });
}

export function supabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { isSingleton: true },
    );
  }

  bindAuthListener(browserClient);
  return browserClient;
}
