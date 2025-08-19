import { supabase } from "../../supabase-client.js";

let cachedId = null;

export async function getUserId() {
  if (cachedId) return cachedId;

  // Try fast local verify first (claims)
  const { data: claims } = await supabase.auth.getClaims();
  const idFromClaims = claims?.sub;
  if (idFromClaims) {
    cachedId = idFromClaims;
    return cachedId;
  }

  // Fallback to full user fetch
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = user?.id;
  if (!id) throw new Error("No authenticated user id found");
  cachedId = id;
  return cachedId;
}

// Clear cache on auth state changes
export function clearUserIdCache() {
  cachedId = null;
}
