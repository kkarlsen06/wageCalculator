import { createRemoteJWKSet, jwtVerify } from "jose";

const projectUrl = process.env.SUPABASE_URL;
if (!projectUrl) {
  throw new Error("SUPABASE_URL is missing. Set it in server/CI envs.");
}

// Strip trailing slashes
const base = projectUrl.replace(/\/+$/, "");
// Supabase issuer claim
const issuer = `${base}/auth/v1`;
// Supabase JWKS endpoint
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function verifySupabaseJWT(token) {
  const { payload, protectedHeader } = await jwtVerify(token, jwks, {
    issuer,
    audience: "authenticated", // Supabase client tokens default
  });

  // sanity check
  if (protectedHeader.alg && protectedHeader.alg !== "RS256") {
    console.warn("Unexpected JWT alg:", protectedHeader.alg);
  }

  return payload; // contains sub, role, email, etc.
}