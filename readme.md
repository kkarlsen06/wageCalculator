## WageCalculator (Vaktberegner)

A modern, production-grade web app for calculating wages based on shifts, hourly rates, and tariff levels. Built with a multi-page Vite frontend and a Node/Express API that integrates with Supabase (RLS-enabled). The app supports individual use and team/manager workflows with authoritative shift history and CSV exports.

### Live

- Marketing: https://www.kkarlsen.dev
- App: https://kalkulator.kkarlsen.dev

Note: The marketing site and the app are deployed as separate sites/domains. The app calls the API directly (no Netlify proxy). In development, Vite proxies `/api` to the backend.

## Features

- **Shift planning and wage calculation**: Accurate calculations including base pay, weekend/holiday bonuses and configurable pause deduction policies.
- **Tariff support (Virke 2025)**: Built-in levels `-2, -1, 1..6` and custom wage; tariff-to-rate mapping handled server-side and surfaced in UI.
- **Employees (manager mode)**: Manager-owned placeholder employees (no real auth users) with complete CRUD and color tagging; filter shifts by employee.
- **Authoritative history**: `employee_shifts` store immutable snapshots of wage context (`employee_name_snapshot`, `tariff_level_snapshot`, `hourly_wage_snapshot`).
- **Org settings**: Break policy controls paid hours calculation (e.g. `fixed_0_5_over_5_5h`, `proportional_across_periods`, `from_base_rate`, `none`).
- **Exports**: CSV export with consistent column order for accounting/reporting.
- **Profile & avatars**: Optional avatar upload through the server to Supabase Storage (signed URLs, no client exposure of secrets).
- **Feature flags**: `/config` endpoint powers client-side toggles (e.g., employees UI), with caching and graceful fallbacks.
- **Metrics & audit**: `/metrics` (Prometheus) and admin-only recent audit log endpoint.

## Tech Stack

- Frontend: Vite apps in `marketing/` (landing) and `app/` (kalkulator). Vanilla JS + HTML/CSS.
- Backend: Node.js 22+, Express, Supabase JS client, optional OpenAI.
- Database: Supabase Postgres with RLS. See `docs/rls_policies.sql`.
- Hosting: Netlify (marketing + app) and Azure Web App (API).

## Project Structure

```
wageCalculator/
├── marketing/                     # Marketing site (Vite)
│   ├── index.html
│   ├── src/
│   └── vite.config.mjs
├── app/                           # Kalkulator app (Vite)
│   ├── index.html
│   ├── login.html
│   ├── onboarding.html
│   ├── js/                        # legacy UI modules
│   ├── css/
│   ├── public/                    # PWA manifest, icons, redirects
│   └── src/                       # ESM bootstrap + helpers
│       ├── kalkulator.js
│       ├── runtime-config.js
│       └── supabase-client.js
├── server/                        # Express API (Azure Web App)
│   ├── server.js
│   ├── middleware/
│   ├── lib/
│   └── payroll/calc.js
├── docs/
│   ├── OPENAPI.yaml
│   ├── ARCHITECTURE_AND_SNAPSHOTS.md
│   └── rls_policies.sql
├── netlify.toml                   # Marketing build + redirects
└── package.json                   # Workspaces (marketing, app, server)
```

## Getting Started

Prerequisites:
- Node.js >= 22
- npm

### 1) Clone

```bash
git clone https://github.com/kkarlsen06/wageCalculator.git
cd wageCalculator
```

### 2) Frontend (Vite)

Monorepo workspaces:

```bash
npm install

# Marketing (5174)
npm run dev:marketing

# App (5173)
npm run dev:app
```

Dev server behavior (app):
- `app/vite.config.js` proxies `/api` to your server in dev (defaults to `https://server.kkarlsen.dev`).
- Override with `app/.env.local`: `VITE_API_BASE=http://localhost:3000`.

### 3) Backend (Express)

```bash
cd server
npm install
npm start
# http://localhost:3000
```

Provide required environment variables (see Environment below). The API expects `Authorization: Bearer <JWT>` headers for protected routes.

Dev-only auth debug endpoint is available when `NODE_ENV !== 'production'`:

```bash
curl -i http://localhost:3000/auth/debug -H "Authorization: Bearer <access_token>"
```

## Environment

### Frontend (Vite at build time)
- `VITE_SUPABASE_URL` (app): Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` (app): Publishable anon key
- `VITE_API_BASE` (app): API origin in production (e.g., `https://server.kkarlsen.dev`); in dev, Vite proxy handles `/api`.

### Backend (server/.env)
- `SUPABASE_URL` — required (PostgREST URL)
- `SUPABASE_SERVICE_ROLE_KEY` — required (service role; never expose to client)
- `OPENAI_API_KEY` — optional (disables OpenAI features if missing)
- `CORS_ORIGINS` — comma-separated allowlist; empty disables CORS
- `JSON_BODY_LIMIT` — e.g. `1mb`
- `FEATURE_EMPLOYEES` — default ON; set to `false` to hide employees feature in `/config`
- `AGENT_BLOCK_READS` — `true` to fully block AI agent JWTs from reads
- `AUDIT_PAYLOAD_MAX_CHARS` — truncation limit for audit payloads (default 2000)
- `PORT` — default `3000`
- `ENABLE_STATIC` / `STATIC_DIR` — optional, serve additional static assets in dev

Do not put server-only secrets in Netlify environment (frontend). Only `VITE_*` variables are safe for client builds.

<!-- Dev smoke test scripts have been removed as part of repository cleanup -->

### Proxies and Authorization

Ensure your proxy (Azure App Service, Netlify, NGINX) forwards the `Authorization` header unchanged. We log `req.headers.authorization` on entry for `/settings` and `/employees`. If you see it empty in production but present locally, update proxy config to allow/forward Authorization.

## API

- OpenAPI: see `docs/OPENAPI.yaml`
<!-- Non-fundamental docs (Postman collection, feature-specific guides) have been removed to keep the repo concise. -->

Key endpoints (all under `API_BASE`, defaults to `/api` in frontend):
- `GET /config` — feature flags (e.g., `{ features: { employees: true } }`)
- `GET/PUT /org-settings` — break policy per manager (auth required)
- `GET/POST/PUT/DELETE /employees` — manager-owned placeholder employees (auth required)
- `GET/POST/PUT/DELETE /employee-shifts` — authoritative shifts; server computes paid hours/gross using org break policy (auth required)
- `GET/PUT /settings` — current user settings (auth required)
- `POST /user/avatar` — upload profile image via server to Supabase Storage (auth required)
- `GET /metrics` — Prometheus metrics
- `GET /audit-log/recent` — recent audit events (admin-only)

Example (local backend):

```bash
curl -H "Authorization: Bearer <JWT>" http://localhost:3000/employees
```

## Architecture (high level)

- `employees` — manager-owned placeholder employees (not real auth users)
- `employee_shifts` — authoritative shift history with immutable wage snapshots
- `user_shifts` — manager’s personal planner (optional UI features)
- Break policy applied server-side when reading shifts to compute paid hours and gross

Details and diagram: `docs/ARCHITECTURE_AND_SNAPSHOTS.md`

## Security & Data

- Supabase RLS policies enforce per-manager access and block AI-agent writes. See `docs/rls_policies.sql`.
- Server never exposes service-role keys to the client. Frontend uses only `VITE_*` env vars.
- Audit log sanitizes sensitive keys and caps payload size. Metrics exposed for monitoring.

## Deployment

- Marketing (Netlify): root `netlify.toml` builds `marketing/` and applies simple redirects and security headers.
- App (Netlify): configure site with base directory `app/`. Use `app/public/_redirects` or a `netlify.toml` in site settings for SPA fallback. Set `VITE_*` env vars.
- Backend (Azure Web App): Deploy `server/` as Node.js 22 app with required env. See `.github/workflows/azure-webapp.yml`.

## Contributing

Contributions are welcome. Please open an issue or a pull request with a clear description of the change and testing notes.

## License

ISC © 2025 Hjalmar Samuel Kristensen-Karlsen

—

Primary UI language is Norwegian. The codebase favors explicit, readable JavaScript and server-side validation for correctness and safety.
