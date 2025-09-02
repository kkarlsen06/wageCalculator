import { createRemoteJWKSet, jwtVerify } from "jose";

// Use configurable JWKS URL or default to project JWKS at id.kkarlsen.dev
const SUPABASE_JWKS_URL = process.env.SUPABASE_JWKS_URL || 'https://id.kkarlsen.dev/auth/v1/.well-known/jwks.json';
const jwks = createRemoteJWKSet(new URL(SUPABASE_JWKS_URL));

export async function verifySupabaseJWT(token) {
  // Verify using remote JWKS; restrict to ES256
  const { payload } = await jwtVerify(token, jwks, { algorithms: ["ES256"] });
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
