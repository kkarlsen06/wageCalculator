// Robust user ID retrieval helper
let cachedUserId = null;

async function getUserId() {
  if (cachedUserId) return cachedUserId;

  // Try fast local verify first (claims)
  const { data: claims } = await window.supa.auth.getClaims();
  const idFromClaims = claims?.sub;
  if (idFromClaims) {
    console.debug("[auth] using userId from claims:", idFromClaims);
    cachedUserId = idFromClaims;
    return cachedUserId;
  }

  // Fallback to full user fetch
  const { data: { user }, error } = await window.supa.auth.getUser();
  if (error) throw error;
  const id = user?.id;
  if (!id) throw new Error("No authenticated user id found");
  console.debug("[auth] using userId from getUser:", id);
  cachedUserId = id;
  return cachedUserId;
}

// Clear cache on auth state changes
function clearUserIdCache() {
  cachedUserId = null;
}

// Guard function to check if user ID exists before queries
async function guardedUserId() {
  const userId = await getUserId();
  if (!userId) throw new Error("Missing user id");
  return userId;
}

// Set up auth state listener to clear cache on auth changes
if (window.supa) {
  window.supa.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      clearUserIdCache();
      console.debug('[auth] Cache cleared due to auth state change:', event);
    }
  });
}

// Make functions globally available
window.getUserId = getUserId;
window.clearUserIdCache = clearUserIdCache;
window.guardedUserId = guardedUserId;
