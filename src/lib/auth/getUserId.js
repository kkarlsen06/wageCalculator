// @ts-nocheck
import { supabase } from "../../supabase-client.js";
let cachedId = null;
let inflight = null;
export async function getUserId() {
  if (cachedId) return cachedId;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data: claims } = await supabase.auth.getClaims();
      const sub = claims && claims.sub;
      if (sub) { cachedId = sub; console.debug("[auth] userId (claims):", cachedId); return cachedId; }
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) { console.warn("[auth] getUser() error:", error.message || error); return null; }
      cachedId = user && user.id ? user.id : null;
      if (cachedId) console.debug("[auth] userId (user):", cachedId);
      return cachedId;
    } catch (e) { console.warn("[auth] getUserId error:", e && e.message ? e.message : e); return null; }
    finally { inflight = null; }
  })();
  return inflight;
}
