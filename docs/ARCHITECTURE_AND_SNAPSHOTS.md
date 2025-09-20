## Architecture

### High-level
- Two Vite frontends: `marketing/` (landing) and `app/` (kalkulator)
- Node/Express backend under `server/` exposes REST API used by the app
- Supabase Postgres used for data storage with RLS; Supabase Storage used for avatars
- Netlify hosts marketing and app on separate domains; the app calls the API directly in prod (no proxy). Vite dev uses a proxy.

### Frontend
- Marketing: `marketing/index.html` → `marketing/src/main.js`
- App: `app/index.html`, `app/login.html`, `app/onboarding.html` → `app/src/kalkulator.js` and legacy JS under `app/js/`
- `app/src/runtime-config.js` bridges Vite envs to legacy code as `window.CONFIG`
- `app/src/supabase-client.js` creates a publishable Supabase client using `VITE_*` vars

### Backend
- `server/server.js` is a single Express app with route groups:
  - Health: `/health`, `/health/deep`
  - Auth debug (dev only): `/auth/debug`, `/auth/session-echo`
  - Config/flags: `/config`
  - Settings: `/settings` (current user), `/org-settings`
  - Employees: `/employees`
  - Shifts: `/shifts` (personal planner), `/employee-shifts` (authoritative)
  - Metrics: `/metrics`
  - Audit log: `/audit-log/recent`
- Auth: `server/middleware/auth.js` and `server/lib/auth/verifySupabaseJwt.js` enforce and verify bearer tokens using JWKS
- Supabase admin client: created with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Payroll calculation: `server/payroll/calc.js` computes `durationHours`, `paidHours`, `gross` with policy `break_policy`

Prefix behavior:
- Dev: the app uses Vite proxy for `/api`.
- Prod: the app calls the API origin set via `VITE_API_BASE` (e.g., `https://server.kkarlsen.dev`).

### Runtime Data Flow
1. Browser authenticates with Supabase Auth
2. Client sends API requests with `Authorization: Bearer <access_token>`
3. Server verifies JWT via JWKS, loads Supabase admin client, performs RLS-compliant queries
4. Server returns normalized JSON to the client

### Snapshots (Employee Shifts)
- The `employee_shifts` table stores wage context snapshots:
  - `employee_name_snapshot`
  - `tariff_level_snapshot`
  - `hourly_wage_snapshot`
- Server derives:
  - `duration_hours`, `paid_hours`, `gross`
- This yields immutable and auditable shift history independent of later tariff or wage changes

