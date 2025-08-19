// Usage: TEST_JWT="<paste access token>" node scripts/smoke-auth.js
import { verifySupabaseJWT } from "../server/lib/verifySupabaseJwt.js";

(async () => {
  const t = process.env.TEST_JWT;
  if (!t) throw new Error("Set TEST_JWT");
  const claims = await verifySupabaseJWT(t);
  console.log("claims:", { sub: claims.sub, email: claims.email, role: claims.role });
})().catch(e => { console.error(e.message); process.exit(1); });


