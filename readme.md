## WageCalculator (Vaktberegner)

A modern, production-grade web app for calculating wages based on shifts, hourly rates, and tariff levels. Built with a multi-page Vite frontend and a Node/Express API that integrates with Supabase (RLS-enabled). The app supports individual use and team/manager workflows with authoritative shift history and CSV exports.

### Live

- Landing page: `https://kkarlsen.art`
- App: `https://kkarlsen.art/kalkulator`

Note: In production, the frontend is built with Vite and hosted on Netlify. API requests are proxied to an Azure Web App (`/api -> https://wageapp-prod.azurewebsites.net`).

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

- **Frontend**: Vite (multi-page), HTML5, CSS, vanilla JavaScript (ESM). Entries: `index.html` and `kalkulator/index.html` with `src/main.js` and `src/kalkulator.js`.
- **Backend**: Node.js 22+, Express, Supabase JS client, optional OpenAI.
- **Database**: Supabase Postgres with RLS. See `docs/rls_policies.sql`.
- **Hosting**: Netlify (frontend) with `_redirects`/`netlify.toml` proxying API to Azure Web App.

## Project Structure

```
wageCalculator/
├── index.html                     # Landing page (Vite entry -> src/main.js)
├── kalkulator/                    # App UI (Vite entry -> src/kalkulator.js)
│   ├── index.html
│   ├── login.html
│   ├── css/
│   ├── js/
│   └── manifest.json              # PWA metadata (no service worker)
├── src/
│   ├── main.js
│   ├── kalkulator.js              # Boots legacy JS via ESM, loads runtime config
│   └── runtime-config.js          # Exposes VITE_* as window.CONFIG for legacy code
├── server/                        # Express API (Azure Web App)
│   ├── server.js
│   └── payroll/calc.js            # Core shift/payroll calculations
├── docs/
│   ├── OPENAPI.yaml               # API schema (served under /api)
│   ├── POSTMAN_COLLECTION.json    # Example requests
│   ├── ARCHITECTURE_AND_SNAPSHOTS.md
│   └── rls_policies.sql
├── vite.config.js                 # Multi-entry build + dev proxy (/api)
├── netlify.toml                   # Build + /api proxy in production
└── _redirects                     # Netlify redirects/proxy
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

```bash
npm install
npm run dev
# http://localhost:5173
```

Dev server behavior:
- By default, `vite.config.js` proxies `/api` to the Azure backend `https://wageapp-prod.azurewebsites.net`.
- To use a local backend, set `VITE_API_BASE=http://localhost:3000` in a `.env.local` and restart Vite.

### 3) Backend (Express)

```bash
cd server
npm install
npm start
# http://localhost:3000
```

Provide required environment variables (see Environment below). The API expects `Authorization: Bearer <JWT>` headers for protected routes.

## Environment

### Frontend (Vite at build time)
- `VITE_SUPABASE_URL` (optional; default set in `src/runtime-config.js`)
- `VITE_SUPABASE_ANON_KEY` (optional; default set in `src/runtime-config.js`)
- `VITE_API_BASE` (optional; default `/api`) — set to `http://localhost:3000` for local backend

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

## API

- OpenAPI: see `docs/OPENAPI.yaml`
- Postman: `docs/POSTMAN_COLLECTION.json`

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

- **Frontend (Netlify)**: `netlify.toml` builds Vite and proxies `/api` to Azure; `_redirects` mirrors the proxy.
- **Backend (Azure Web App)**: Deploy `server/` as Node.js 22 app with the environment variables listed above.

## Contributing

Contributions are welcome. Please open an issue or a pull request with a clear description of the change and testing notes.

## License

ISC © 2025 Hjalmar Samuel Kristensen-Karlsen

—

Primary UI language is Norwegian. The codebase favors explicit, readable JavaScript and server-side validation for correctness and safety.
