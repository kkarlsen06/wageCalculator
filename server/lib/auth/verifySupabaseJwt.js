import { createRemoteJWKSet, jwtVerify } from "jose";

const projectUrl = process.env.SUPABASE_URL;
if (!projectUrl) {
  throw new Error("SUPABASE_URL is missing. Set it in server/CI envs.");
}

const issuer = `${projectUrl.replace(/\/+$/, "")}/auth/v1`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function verifySupabaseJWT(token) {
  const { payload, protectedHeader } = await jwtVerify(token, jwks, {
    issuer,
  });
  // minimal sanity check; Supabase uses RS256 today
  if (protectedHeader.alg && protectedHeader.alg !== "RS256") {
    // don't fail hard; just surface
    // console.warn("Unexpected JWT alg:", protectedHeader.alg);
  }
  return payload; // sub, role, email, etc.
}
