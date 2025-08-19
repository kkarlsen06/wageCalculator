import { supabase } from "../../supabase-client.js";

let cachedId = null;

export async function getUserId() {
  if (cachedId) return cachedId;

  // Try claims first
  const { data: claims } = await supabase.auth.getClaims();
  const sub = (claims)?.sub;
  if (sub) {
    cachedId = sub;
    return cachedId;
  }

  // Fallback to full user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("[auth] getUser() error:", error.message);
    return null;
  }
  if (user?.id) {
    cachedId = user.id;
    return cachedId;
  }

  return null;
}

// Clear cache on auth state changes
export function clearUserIdCache() {
  cachedId = null;
}
