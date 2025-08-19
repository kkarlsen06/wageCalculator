import { supabase } from "../../supabase-client.js";

let cachedId: string | null = null;
let inflight: Promise<string | null> | null = null;

export async function getUserId(): Promise<string | null> {
  if (cachedId) return cachedId;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      // Rask lokal sjekk (asymmetrisk JWT)
      const { data: claims } = await supabase.auth.getClaims();
      const sub = (claims as any)?.sub as string | undefined;
      if (sub) {
        cachedId = sub;
        console.debug("[auth] userId (claims):", cachedId);
        return cachedId;
      }

      // Fallback til full bruker
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.warn("[auth] getUser() error:", (error as any).message || error);
        return null;
      }
      cachedId = user?.id ?? null;
      if (cachedId) console.debug("[auth] userId (user):", cachedId);
      return cachedId;
    } catch (e: any) {
      console.warn("[auth] getUserId error:", e?.message || e);
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}


