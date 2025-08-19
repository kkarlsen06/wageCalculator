import { verifySupabaseJWT } from "../lib/auth/verifySupabaseJwt.js";

const token = process.env.TEST_JWT;
if (!token) {
  console.error("Set TEST_JWT env var with a real access token.");
  process.exit(1);
}

verifySupabaseJWT(token).then(claims => {
  console.log("OK:", { sub: claims.sub, role: claims.role, email: claims.email });
}).catch(e => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
