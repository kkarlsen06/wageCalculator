# Security Policy

## JWT Authentication

This application uses **JWKS-based JWT verification** for secure authentication:

- **JWT Issuer**: `${SUPABASE_URL}/auth/v1`
- **Verification Method**: Asymmetric cryptography using Supabase's JWKS endpoint
- **Algorithm**: ES256 (asymmetric keys only)
- **Key Rotation**: Supabase keys should be rotated quarterly for security

### Server-Side Verification

The server verifies JWTs using the `jose` library by:
1. Fetching public keys from `${SUPABASE_JWKS_URL}` (default `https://id.kkarlsen.dev/auth/v1/.well-known/jwks.json`)
2. Validating JWT signatures cryptographically using ES256

**No JWT secrets are stored on the server** — verification uses public keys (remote JWKS) only.

## Environment Variables

### Client-Side (Safe for Browser)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public anon key (safe for client exposure)

### Server-Side (Never expose to client)
- `SUPABASE_URL` - Same as client, but for server operations
- `SUPABASE_SERVICE_ROLE_KEY` - Secret service role key with elevated permissions

## Security Guidelines

### 🔒 Key Management
- **NEVER** ship service role keys to the browser
- **ALWAYS** use publishable/anon keys on the client side
- **ROTATE** Supabase keys quarterly via dashboard
- **REVOKE** compromised keys immediately

### 🛡️ CI/CD Security
The build pipeline includes guardrails to prevent accidental secret exposure:
- Scans client code for service role key patterns
- Fails builds if sensitive keys detected in `src/` directory

### 🔍 Monitoring
- Server logs JWT verification failures
- Client code includes defensive checks to remove server-only keys
- Access patterns are logged for audit purposes

## Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** create a public issue
2. Email security concerns privately
3. Include steps to reproduce if possible
4. Allow time for patching before disclosure

## Security Updates

- JWT migration completed: Asymmetric key verification implemented
- Legacy symmetric JWT secrets removed
- JWKS-based verification active since last key rotation
