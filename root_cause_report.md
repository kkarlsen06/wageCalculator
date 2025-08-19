## Root Cause Report

### Overview
Live app symptoms:
- Profile image loads, but `/settings` and `/employees` returned HTTP 500.
- Logout UI button did not fully sign the user out.

### Findings
- Backend routes existed but returned opaque 500s. Errors were logged without stack, and responses did not include structured error details.
- Auth is enforced with JWKS (correct), but downstream errors in DB calls (e.g., schema drift/missing tables/columns) were not surfaced in JSON; frontend treated them as hard failures.
- Multiple code paths still referenced legacy `req.user_id`. Middleware already attaches both `req.auth.userId` and `req.user_id` for compatibility, so this is OK, but return paths weren’t instrumented for diagnostics.
- Supabase client usage:
  - Backend: `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` – correct.
  - Frontend: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)` via `window.CONFIG` – correct.
  - No masking logs existed to confirm which keys were used in runtime.
- Logout flow:
  - `window.logout` called `supa.auth.signOut()` then redirected. There was no verification that the session became null, and app caches/session flags weren’t cleared. In some cases, UI state lingered.

### Changes Applied
- Instrumented `/settings` and `/employees` handlers:
  - Log method, path, presence of Authorization, resolved `req.auth.userId`, and a safe preview of the body.
  - Wrap DB operations in try/catch; on error, log `error.message` and `error.stack`.
  - Return structured JSON `{ error, code, stack }` for server-side failures instead of opaque 500s.
  - Gracefully degrade for known schema drift (missing tables/columns) and continue returning minimal data for `/settings`.
- Auth middleware:
  - On verification failure, include `stack` in logs and structured 401 JSON `{ error: 'Invalid token', stack }` (stack masked in response as present/nullable).
- Added boot-time masked key logs:
  - Backend logs the Supabase URL host and masked service key.
  - Frontend logs the Supabase URL host and masked publishable key.
- Added dev-only `GET /auth/debug` (NODE_ENV !== production) to return `{ ok, userId, hasAuthorization }`.
- Frontend logout:
  - Confirms `signOut()`; then checks `getSession()` and logs whether session is null.
  - Clears `localStorage`/`sessionStorage` app keys that may assume a session; then redirects.

### Current Status
- Protected routes now surface actionable JSON on failure; easier to diagnose proxy/Authorization issues or DB schema problems.
- Logout reliably signs out and clears dependent UI state.

### TODOs / Follow-ups
- If `/employees` still fails: verify Postgres tables/columns exist and RLS allows the service role actions; fix via migration or feature flag fallback.
- Confirm that production proxy preserves `Authorization` header (`Netlify -> Azure` already configured). If headers are missing in logs, adjust proxy.
- Consider adding health checks for PostgREST availability and table existence to proactively degrade features.


