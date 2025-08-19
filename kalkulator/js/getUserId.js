// Robust user ID retrieval helper
let cachedUserId = null;

async function getUserId() {
  if (cachedUserId) return cachedUserId;

  // Try claims first
  const { data: claims } = await window.supa.auth.getClaims();
  const sub = (claims)?.sub;
  if (sub) {
    cachedUserId = sub;
    return cachedUserId;
  }

  // Fallback to full user
  const { data: { user }, error } = await window.supa.auth.getUser();
  if (error) {
    console.error("[auth] getUser() error:", error.message);
    return null;
  }
  if (user?.id) {
    cachedUserId = user.id;
    return cachedUserId;
  }

  return null;
}

// Clear cache on auth state changes
function clearUserIdCache() {
  cachedUserId = null;
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
