## Agents Reference (Development Focus)

### Quick Snapshot
- Monorepo with npm workspaces; everything is ESM and targets Node 22+
- Core stack: Express API (`server/`), Vite SPA (`app/`), separate Vite marketing site (`marketing/`)
- Data/Auth layer: Supabase (RLS enforced) plus Supabase Storage for avatars
- Integrations: Stripe (checkout, billing portal), OpenAI (chat+agent loop), WebSockets (progress streaming)
- Default local flow: Vite serves the app and proxies `/api` → Express; production hits API directly via `window.CONFIG`

### High-Level Layout (top level)
- `app/` – primary SPA (“kalkulator”); HTML entry points live in the folder root, code in `app/src`
- `marketing/` – marketing landing pages, Vite powered
- `server/` – Express application with all routes, middleware, payroll logic, and WebSocket agent loop
- `docs/` – architecture, API specs, database notes (keep these in sync with route/schema changes)
- `packages/` – shared utilities and experimental modules (review per task)
- `resources/`, `scripts/`, `supabase/` – supporting assets, maintenance scripts, database helpers
- Root `agents.md` (this file) + various checklists (`OFFLINE_SYNC_IMPLEMENTATION.md`, `PRODUCTION_CHECKLIST.md`)

### Backend (`server/`) Field Guide
- Entry point: `server/server.js` sets up logging, CORS allow-lists, JSON parsing, liveness checks, Stripe hooks, SSE, and WebSocket support
- Auth: always funnel protected routes through `authMiddleware` (`server/middleware/auth.js`) which wraps `verifySupabaseJWT`
- Data access: Supabase admin client created once (`createClient` with service role key). Respect RLS by filtering on authenticated `userId`
- Payroll: `server/payroll/calc.js` contains pure helpers (`calcEmployeeShift`, `applyBreakPolicy`); never introduce side effects
- Agent/chat loop: inline in `server/server.js` (tool execution with wall-clock and per-tool timeouts, event streaming via SSE + `ws`)
- Config/constants: `SYSTEM_PROMPT`, Stripe helpers, timeout utilities all inside `server/server.js` grouped by large comment banners
- Error handling: respond with JSON objects (`{ ok: false, error }` pattern). Guard secrets in logs; redaction already present for tool outputs
- Tests: run with `npm run test` in `server/` (`tests/auth.test.js`, `tests/payroll.test.js`). Auth test expects env vars to be populated

### Frontend App (`app/`) Field Guide
- Bootstrap: `app/src/kalkulator.js` wires runtime config, Supabase client, feature flags, offline sync, service worker registration, and SPA router
- Runtime config: `app/src/runtime-config.js` lifts `VITE_*` vars into `window.CONFIG` (sanitises to avoid leaking server secrets)
- Supabase: client wrapper in `app/src/supabase-client.js`; always pull session tokens from there
- SPA routing: `app/src/router.js`; DOM-heavy legacy logic continues to live in `app/src/js/app.js` and friends
- Feature modules: `app/src/js/` contains focused utilities (offline sync manager, subscription state, checkout flow, theme integration, error helper)
- Realtime: `app/src/realtime/client.js` handles channels via Supabase realtime APIs
- Offline/pwa: service worker at `/service-worker.js`; offline queue management handled by `offline-sync-manager.js`
- Build/dev: `npm --workspace app run dev` (Vite), `npm --workspace app run build`; preview served via `vite preview`

### Marketing Site (`marketing/`)
- Lightweight Vite project for the public landing page. Routes and content under `marketing/src`
- Shares design tokens with the app where practical but is largely static content

### Styling & UX Themes
- Global CSS variables drive theming (`--surface-card`, `--shadow-card`, etc.); check `app/src/css/style.css` and related files
- Skeleton loaders: toggled via `body.skeleton-active` with matching DOM selectors (keep new components consistent with this pattern)
- Mobile-first: frequent viewport calculations (`setAppHeight`, safe-area insets). Preserve guard clauses that prevent viewport jitter in chat or PWA modes
- Theme system: `themeManager.js` + `themeIntegration.js` keep light/dark/system synced, update favicons, and handle skeleton completion
- Animations: subtle transforms on hover, transitions controlled by CSS variables; avoid abrupt layout shifts

### Coding Habits & Conventions
- Prefer guard clauses and descriptive naming; functions are short and cohesive
- Console logging is structured (e.g., `[auth]`, `[boot]`, `[sub]` prefixes). Never log secrets
- Comments explain *why*; code should be otherwise self-descriptive
- Backend uses async/await with explicit try/catch around external calls (Supabase, Stripe, OpenAI)
- Responses always JSON (no redirects); even `/` returns a JSON status payload
- Frontend avoids hardcoded URLs—always use `window.CONFIG.apiBase` or derived stream base
- When dealing with arrays/objects, spread clones are preferred over mutation; timezone logic uses UTC minutes helpers
- Keep features feature-flag aware (fetch `/config`, check `window.CONFIG.flags` before rendering gated UI)

### Data, Auth, and Integrations
- Supabase JWTs verified against remote JWKS (`SUPABASE_JWKS_URL`, default `https://id.kkarlsen.dev/...`)
- Agent (AI) tokens contain `ai_agent` claims; server blocks writes for them. Preserve these checks when touching auth or routes
- Stripe usage split between REST calls (with native `fetch`) and Stripe SDK (apiVersion pinned to `2024-06-20`)
- WebSockets: `ws` server broadcasts lightweight progress; SSE used for chat/agent progress stream
- OpenAI client optional—code gracefully handles missing `OPENAI_API_KEY`

### Environment & Config
- `.env` lives at repo root; `server/server.js` explicitly loads it via `dotenv.config({ path: join(__dirname, '..', '.env') })`
- Important vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWKS_URL`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `PUBLIC_APP_BASE_URL`, feature flags like `FEATURE_EMPLOYEES`
- Frontend uses `VITE_API_BASE` and friends. Anything secret must stay server-side; runtime bridge strips unknown keys
- JSON body limit defaults to `1mb` (override with `JSON_BODY_LIMIT` if needed)

### Testing, Scripts, and Tooling
- Root scripts rely on `npm-run-all`; `npm run dev` attempts to free port 3000 then spawns dev servers (app, server, marketing)
- Clean builds with `npm run clean` (runs `scripts/clean-dists.mjs`). Smoking test for SPA in `scripts/smoke-spa.mjs`
- Server tests: `npm --workspace server run test` (auth + payroll). Add new tests next to existing ones and wire them into the script if critical
- Linting not enforced by tooling; follow existing style manually (2-space indents, trailing commas typically omitted)

### Working With Routes & Features
- Add new API routes in `server/server.js`; keep grouping by domain and reuse helper functions where possible
- Always validate inputs (UUIDs, date strings, numeric bounds). Reject early with status 400/422 style JSON errors
- Respect ownership: queries must include `user_id` or `manager_id` filters matching `req.auth.userId`
- When extending payroll logic, update `docs/DATABASE.md` and keep calculations pure + unit-tested
- For client features, wire new modules under `app/src/js/` or `app/src/lib/` and import through `kalkulator.js` if they need early bootstrap
- Update docs (`docs/API.md`, `docs/OPENAPI.yaml`) whenever API surfaces change. Mention feature flag requirements in `docs/ARCHITECTURE_AND_SNAPSHOTS.md`

### UI Implementation Tips
- Interact with DOM via vanilla JS; legacy code uses `document.querySelector` and attaches listeners on `DOMContentLoaded`
- Keep new components resilient to SPA route class toggles (`html.spa-route`, `body.spa-route`)
- Respect `chatbox-view`, `dashboard-cards-loaded`, and similar classes—other modules rely on them for layout control
- For modals/toasts, reuse `window.ErrorHelper` utilities rather than introducing new notification logic

### Useful References & Docs
- `readme.md` for quickstart, `env.example` for required config
- `OFFLINE_SYNC_IMPLEMENTATION.md` documents offline queue behavior
- `PRODUCTION_CHECKLIST.md` lists deployment validation steps
- `docs/` folder houses authoritative architecture, API, environment, and database docs—sync any breaking change here

Keep this sheet updated as the code evolves; future revisions should capture new routes, shared helpers, or conventions so we maintain high context between tasks.
