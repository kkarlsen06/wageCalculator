import { createRemoteJWKSet, jwtVerify } from "jose";

const projectUrl = process.env.SUPABASE_URL;
if (!projectUrl) {
  throw new Error("SUPABASE_URL is missing. Set it in server/CI envs.");
}

// Strip trailing slashes
const base = projectUrl.replace(/\/+$/, "");
// Supabase issuer claim
const issuer = `https://iuwjdacxbirhmsglcbxp.supabase.co/auth/v1`;
// Supabase JWKS endpoint
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

export async function verifySupabaseJWT(token) {
  const { payload, protectedHeader } = await jwtVerify(token, jwks, {
    issuer,
    audience: "authenticated", // Supabase client tokens default
  });

  // Sanity check: Accept modern asymmetric algs; warn only on other values
  if (protectedHeader.alg && !["RS256", "ES256"].includes(protectedHeader.alg)) {
    console.warn("[auth] Unrecognized JWT alg:", protectedHeader.alg);
  }

  return payload; // contains sub, role, email, etc.
}

/**
 * Extracts and verifies UID from Authorization Bearer token
 * @param {string} authHeader - The Authorization header value
 * @returns {Promise<string|null>} - Returns Supabase UID (sub claim) or null if invalid
 */
export async function getUidFromAuthHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[auth] Missing or invalid Authorization header');
    return null;
  }
  
  try {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = await verifySupabaseJWT(token);
    
    if (!payload.sub) {
      console.warn('[auth] JWT missing sub claim');
      return null;
    }
    
    return payload.sub; // This is the Supabase UID
  } catch (error) {
    console.warn('[auth] JWT verification failed:', error.message);
    return null;
  }
}
