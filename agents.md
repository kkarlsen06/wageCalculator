## Agents Guide (Development Focus)

This guide explains the codebase from a developer’s perspective so agents can plan features, implement changes, and fix bugs effectively. It covers structure, where logic lives, conventions, and how subsystems interact. Ops details are intentionally minimized.

### Overview
- Frontend: Vite (multi-page) at repo root. Entries: `index.html`, `kalkulator/index.html`, `kalkulator/login.html`.
- Backend: Node/Express in `server/` (ESM, Node 22+). Supabase Postgres for data (with RLS) and Supabase Storage for avatars.
- Hosting: Frontend on Netlify; backend on Azure Web App. Netlify proxies `/api/*` to the backend.

### Codebase structure (what lives where)
- Root pages: `index.html`, `kalkulator/index.html`, `kalkulator/login.html`
- Frontend source: `src/`
  - `src/main.js` (landing), `src/kalkulator.js` (app bootstrap)
  - `src/runtime-config.js` — bridges `VITE_*` envs to legacy code via `window.CONFIG`
  - `src/supabase-client.js` — publishable Supabase client
  - `src/js/` — shared utilities (loading, errors, redirects, animations)
- Legacy app UI: `kalkulator/js/`, `kalkulator/css/` — main interactive app code and styles
- Backend: `server/`
  - `server/server.js` — all routes and orchestration
  - `server/middleware/auth.js` — bearer auth middleware (JWKS verified)
  - `server/lib/auth/verifySupabaseJwt.js` — JWT verification
  - `server/payroll/calc.js` — pure payroll functions
- Docs: `docs/` — architecture, API, environment, etc.

### Architectural patterns and conventions
- Single Express app with explicit route handlers grouped by domain (settings, employees, shifts, reports, chat).
- Validation and ownership checks live in the route handlers; Supabase RLS enforces data-level security.
- Pure calculation in `server/payroll/calc.js` — side-effect free and easily testable.
- Frontend uses a light abstraction: `window.CONFIG.apiBase` for API base, `supabase` client for auth/user.
- Legacy DOM manipulation in `kalkulator/js/app.js` and related modules; prefer small, focused functions.
- Logging: structured console logs; avoid logging secrets; audit payloads are redacted and size-capped.

### Where to implement new features
- Backend endpoints: add to `server/server.js`. Include:
  - Auth: use `authMiddleware` or `authenticateUser` as appropriate
  - Validation: type/format checks (dates, times), ownership, and conflict detection
  - RLS compatibility: ensure filters include the authenticated user/manager
  - Errors: return consistent JSON shapes with helpful messages
- Payroll changes: modify `server/payroll/calc.js`; keep functions pure and deterministic. Update docs (`docs/DATABASE.md`).
- Frontend UI flows: `kalkulator/js/*` and `kalkulator/index.html`. Keep DOM changes minimal and resilient to mobile viewport issues.
- Shared client utilities or auth helpers: under `src/js/` or `src/lib/`.

### Security model (what to keep in mind when coding)
- Auth: Bearer JWTs from Supabase; verified server-side with JWKS (no symmetric secrets).
- Authorization: Supabase RLS restricts access by `user_id/manager_id`; server double-checks ownership.
- Agent restrictions: JWTs with `ai_agent` are blocked from writes; optionally from reads. Don’t rely on agent writes in your feature plans.
- Secrets hygiene: never expose `SUPABASE_SERVICE_ROLE_KEY` or other server-only secrets in client code; use only `VITE_*` on the frontend.

### Domain modules (how to find logic quickly)
- Config and flags
  - `GET /config` — feature flags. Env-controlled (e.g., `FEATURE_EMPLOYEES`).
- Settings and profile
  - `GET/PUT /settings` — current user settings incl. `profile_picture_url` (graceful schema drift handling).
  - `POST /user/avatar` — uploads via server to Supabase Storage; no client-side secrets.
- Organization
  - `GET/PUT /org-settings` — holds `break_policy` used by payroll.
- Employees
  - `GET/POST/PUT/DELETE /employees` — normalized names, unique per manager, input validation.
- Shifts
  - Personal planner: `GET/POST/PUT/DELETE /shifts` (per-user `user_shifts`).
  - Authoritative history: `GET/POST/PUT/DELETE /employee-shifts` (immutable wage snapshots).
- Reports
  - `GET /reports/wages` — CSV export with on-the-fly payroll calc.
- Chat
  - `POST /chat` — streaming SSE with structured progress events.

### Data model and payroll (what to preserve when changing)
- Authoritative snapshots in `employee_shifts` decouple historical wages from future changes.
- `server/payroll/calc.js` must remain pure and deterministic. Handle edge cases:
  - Cross-midnight and 24h equal start/end
  - Policy deduction + explicit `break_minutes`
  - Rounding to 2 decimals at the end

### API calling patterns (for feature code)
- Use `window.CONFIG.apiBase` on the client; do not hardcode hosts.
- Include `Authorization: Bearer <token>` for protected routes (get from `supabase.auth.getSession()`).
- Prefer JSON responses with stable shapes; keep new fields backward-compatible.

### Environment hygiene (during development)
- Only `VITE_*` on client; server-only secrets remain in the backend.
- `src/runtime-config.js` defensively removes server secrets if accidentally present.

### Implementation guidance (how to change things)
- Code style
  - Favor clarity and descriptive names; keep functions small and cohesive
  - Use guard clauses, avoid deep nesting, and handle edge cases up front
  - Comments explain “why”; avoid noise and inline commentary
- Safety
  - Validate inputs thoroughly (dates, times, UUIDs); check ownership via manager/user id
  - Keep server responses consistent; include meaningful messages and avoid leaking internals
  - Add metrics/audit where appropriate; redact sensitive payloads (already implemented)
- Docs & API
  - Update `docs/OPENAPI.yaml` + `docs/API.md` when routes change
  - Update `docs/DATABASE.md` if wage logic, snapshots, or schemas evolve
  - Note feature flags or config in `docs/ARCHITECTURE_AND_SNAPSHOTS.md`

### Quick debugging tips
- Verify `window.CONFIG` and Supabase host/key logs in the console (client)
- Use `/auth/debug` (non-prod) to confirm Authorization header pass-through
- Inspect structured logs around route handlers to see validation failures

### Where to look in the code
- Backend entry: `server/server.js`
- Auth: `server/middleware/auth.js`, `server/lib/auth/verifySupabaseJwt.js`
- Payroll: `server/payroll/calc.js`
- Client Supabase: `src/supabase-client.js`
- Runtime config bridge: `src/runtime-config.js`
- CI/CD: `.github/workflows/azure-webapp.yml`
- Frontend proxy and build entries: `vite.config.js`, `netlify.toml`

For more detail, see the docs under `docs/`: architecture, setup, environment, API, deployment, operations, database, and troubleshooting.
