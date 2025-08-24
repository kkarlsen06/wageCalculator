## Environment Variables

This project uses two sets of environment variables:
- Frontend variables (prefixed with `VITE_`) are safe to expose to the browser
- Backend variables must never be exposed to the client

See `env.example` for a quick reference.

### Frontend (Vite)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase public anon key (publishable)
- `VITE_API_BASE`: Overrides API base for client requests (default `/api`). Set to `http://localhost:3000` to use a local backend in dev.

These are loaded at build time by Vite, and surfaced to legacy code via `src/runtime-config.js` as `window.CONFIG`. Any server-only keys detected in `window.CONFIG` are removed defensively.

### Backend (server)
- `SUPABASE_URL` (required): Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` (required): Service role key for server-side operations (never expose to client)
- `OPENAI_API_KEY` (optional): Enables chat assistant endpoints
- `STRIPE_SECRET_KEY` (required for checkout): Stripe secret API key used server-side
- `STRIPE_WEBHOOK_SECRET` (required for webhook): Endpoint secret for validating `POST /api/stripe-webhook`
- `APP_BASE_URL` (optional): Explicit base URL used to build Stripe success/cancel redirects
- `CORS_ORIGINS` (optional): Comma-separated allowlist for CORS
- `JSON_BODY_LIMIT` (optional, default `1mb`)
- `FEATURE_EMPLOYEES` (optional, default ON): Set to `false` to hide feature in `/config`
- `AGENT_BLOCK_READS` (optional, default `false`): Block reads for AI-agent JWTs
- `AUDIT_PAYLOAD_MAX_CHARS` (optional, default `2000`)
- `PORT` (optional, default `3000`)
- `ENABLE_STATIC` / `STATIC_DIR` (optional): Serve extra static assets in dev

Server-side JWT verification uses `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` with `jose`. No symmetric secrets are stored.

### Security Notes
- Never place backend secrets (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) in Netlify (frontend) environment.
- The server verifies JWTs using JWKS from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.


