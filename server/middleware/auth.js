import { verifySupabaseJWT } from "../lib/verifySupabaseJwt.js";

export async function authMiddleware(req, res, next) {
  const authz = req.headers.authorization || "";
  try {
    console.log(`[auth] ${req.method} ${req.originalUrl || req.url} authz=${authz ? 'yes' : 'no'}`);
  } catch (_) {}
  if (!authz.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  const token = authz.slice(7);
  try {
    const claims = await verifySupabaseJWT(token);
    req.auth = { userId: claims.sub, email: claims.email, role: claims.role };
    // Legacy compatibility to match server's internal expectations
    req.user_id = claims.sub;
    req.is_ai_agent = Boolean(claims.ai_agent || claims.app_metadata?.ai_agent || claims.user_metadata?.ai_agent);
    req.user_role = claims.role || claims.app_metadata?.role || claims.user_metadata?.role || null;
    req.user = {
      id: claims.sub,
      email: claims.email,
      app_metadata: claims.app_metadata || {},
      user_metadata: claims.user_metadata || {}
    };
    try { console.log(`[auth] ok userId=${claims.sub || 'none'}`); } catch (_) {}
    return next();
  } catch (e) {
    console.error("[auth] verify fail:", e?.message || e);
    return res.status(401).json({ error: "Invalid token" });
  }
}


