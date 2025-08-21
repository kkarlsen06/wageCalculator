## Architecture

### High-level
- Vite frontend (multi-page) serves the landing page and the calculator app under `/kalkulator/`
- Node/Express backend under `server/` exposes REST API used by the app
- Supabase Postgres used for data storage with RLS; Supabase Storage used for avatars
- Netlify hosts the frontend; Netlify proxies `/api/*` to the Azure Web App backend

### Frontend
- Entry points:
  - `index.html` → `src/main.js` (landing)
  - `kalkulator/index.html` and `kalkulator/login.html` → `src/kalkulator.js` and legacy JS under `kalkulator/js/`
- `src/runtime-config.js` bridges Vite envs to legacy code as `window.CONFIG`
- `src/supabase-client.js` creates a publishable Supabase client using `VITE_*` vars

### Backend
- `server/server.js` is a single Express app with route groups:
  - Health: `/health`, `/health/deep`
  - Auth debug (dev only): `/auth/debug`, `/auth/session-echo`
  - Config/flags: `/config`
  - Settings: `/settings` (current user), `/org-settings`
  - Employees: `/employees`
  - Shifts: `/shifts` (personal planner), `/employee-shifts` (authoritative)
  - Chat assistant: `/chat` (SSE streaming supported)
  - Metrics: `/metrics`
  - Audit log: `/audit-log/recent`
- Auth: `server/middleware/auth.js` and `server/lib/auth/verifySupabaseJwt.js` enforce and verify bearer tokens using JWKS
- Supabase admin client: created with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Payroll calculation: `server/payroll/calc.js` computes `durationHours`, `paidHours`, `gross` with policy `break_policy`

Prefix behavior:
- Some duplicates exist under `/api/*` (e.g., `/api/employees`, `/api/settings`) to support proxying. Prefer calling without `/api` when addressing the backend directly; use `/api` when going through the Netlify proxy.

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



