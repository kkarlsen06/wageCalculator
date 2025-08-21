## Security Overview

See also the repository root `SECURITY.md` for the policy and guidance.

### Authentication
- Bearer JWTs from Supabase Auth
- Server-side verification via JWKS using `jose`
- Middleware: `server/middleware/auth.js` sets `req.auth`, `req.user_id`, `req.user`

### Authorization
- RLS in Supabase restricts rows to the authenticated user/manager
- Server additionally blocks AI-agent writes and can optionally block reads (`AGENT_BLOCK_READS`)

### Secrets Hygiene
- Client uses only `VITE_*` variables; server-only secrets are never exposed
- CI checks for leaked service-role keys in client code



