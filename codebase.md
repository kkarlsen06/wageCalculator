# Wage Calculator Codebase Map

- [Overview](#overview)
- [Monorepo Layout](#monorepo-layout)
- [Executable Surface](#executable-surface)
- [Authentication & Authorization](#authentication--authorization)
- [Billing & Payments](#billing--payments)
- [Data & Persistence](#data--persistence)
- [Configuration & Environment](#configuration--environment)
- [Tooling, Builds & Tests](#tooling-builds--tests)
- [Error Handling & Observability](#error-handling--observability)
- [Security Posture](#security-posture)
- [Rebuild in Next.js Plan](#rebuild-in-nextjs-plan)
- [Open Questions](#open-questions)

## Overview

Wage Calculator is a Node 22+ monorepo that powers a payroll-focused SPA, a marketing microsite, and an Express API. The stack combines Vite-based frontends, Supabase authentication/storage, and Stripe billing. All code is ESM. The server enforces JWT-based auth, applies feature flags, audits mutating requests, and orchestrates Stripe checkout/portal flows.

## Monorepo Layout

| Workspace          | Description                                                                                 | Notable Dependencies                                                   |
| ------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `server/`          | Express 5 API serving JSON-only endpoints, subscription and billing integrations            | `express`, `@supabase/supabase-js`, `stripe`, `jose`, `cors`, `morgan` |
| `app/`             | Primary SPA (“kalkulator”) built with Vite; focuses on subscription management and checkout | `vite`, `@supabase/supabase-js`                                        |
| `marketing/`       | Static Vite marketing site with shared toast/legal modals                                   | `vite`                                                                 |
| `packages/shared/` | Placeholder shared module (currently empty)                                                 | —                                                                      |
| `scripts/`         | Utility scripts (`clean-dists.mjs`, `smoke-spa.mjs`, etc.)                                  | Node stdlib                                                            |

Dependency relationships are visualised in `_reports/graph.md` (see “Dependency Graph”). Root scripts (`package.json`) fan out to each workspace (`dev:*`, `build:*`, `preview:*`, `test:*`).

## Executable Surface

Complete machine-readable inventory lives in `_reports/routes.json`. Key groups:

### Public & Health

- `GET /health` (`server/server.js:42`) and a duplicate at `server/server.js:121`; the first responds and shadows the second.
- `GET /health/deep` probes Supabase with a 800 ms timeout (`server/server.js:130`).
- `GET /` returns service metadata (`server/server.js:148`).
- `GET /metrics` exposes in-memory denied-agent counters (`server/server.js:437`).
- `GET /config` publishes feature flags consumed by the client (`server/server.js:3316`).

### Authenticated Billing & Stripe

- `POST /api/billing/start` verifies the Bearer token with `getUidFromAuthHeader` and provisions Stripe customers safely (`server/server.js:461`).
- `POST /api/checkout` and legacy `/checkout` run `authenticateUser`, block `ai_agent` writers, and create sessions with metadata consistency (`server/server.js:618`, `server/server.js:775`).
- Billing portal routes (`/api/portal`, `/portal`, `/api/stripe/create-portal-session`, `/stripe/create-portal-session`) share the same security posture (`server/server.js:855`, `973`, `1066`, `1352`).
- Upgrade-specific portal flow lives at `/api/portal/upgrade` and `/portal/upgrade` (`server/server.js:1134`, `1277`).
- `POST /api/stripe-webhook` keeps a raw body, verifies signatures, and upserts Supabase subscription state (`server/server.js:1443`).

### Admin & Diagnostics

- `POST /admin/link-customer`, `GET /admin/unlinked-customers`, and `GET /audit-log/recent` require JWT + `requireAdmin` (`server/server.js:1756`, `1842`, `1881`).
- A legacy `/admin/unlinked-customers` (line `server/server.js:1646`) is gated by `DEV_BYPASS` and manual header verification.

### Developer Utilities

- `/routes-debug`, `/routes-debug2`, and `/ping` support debugging (`server/server.js:3546`, `3582`, `3579`).
- Dev-only auth probes `/auth/debug` and `/auth/session-echo` register when `NODE_ENV !== 'production'` (`server/server.js:175-191`).

### Client SPA Routes

`app/src/router.js:37-109` defines SPA paths rendered client-side. Subscription-centric entries such as `/login`, `/onboarding`, `/abonnement`, and `/settings/*` continue to interact with Supabase and the Express API for billing workflows.

### Realtime & Streaming

The SPA ships a lazy WebSocket client (`app/src/realtime/client.js`) expecting a JWT-subprotocol handshake, but the Express server currently exposes no WebSocket or SSE endpoints. This remains an open question for parity.

## Authentication & Authorization

- Incoming API calls are gated by either `authMiddleware` (`server/middleware/auth.js:1-36`) or the inline `authenticateUser` helper (`server/server.js:1909-1947`). Both verify the Supabase JWT via `verifySupabaseJWT` and attach `req.auth`, `req.user_id`, and AI-agent metadata.
- `blockAgentWrites` (`server/server.js:3167-3199`) blocks writes (and optionally reads via `AGENT_BLOCK_READS`) when the JWT claims `ai_agent`.
- `requireAdmin` checks `req.user_role` and metadata for admin access (`server/server.js:1953-1964`).
- Auth flow diagram in `_reports/graph.md` (“Auth & Session Flow”) captures login, token use, refresh fallback, and webhook processing.

Client-side auth helpers:

- `app/src/supabase-client.js:9-31` resolves Supabase config and instantiates the browser client.
- `app/src/lib/auth/getUserId.js` caches user IDs via `supabase.auth.getClaims()` (`app/src/lib/auth/getUserId.js:1-17`).

## Billing & Payments

- Checkout flows call the API through `app/src/js/checkout.js:1-128`, which retrieves the JWT, posts to `/api/checkout`, retries legacy paths, and handles toasts.
- Billing portal helpers (`startBillingPortal`, `startPortalUpgrade`) align with the Express endpoints (`app/src/js/checkout.js:70-182`).
- Webhook processor (`server/server.js:1443-1701`) verifies signatures (`stripe.webhooks.constructEvent`), retrieves the authoritative event, enforces UID presence, upserts Supabase records, and logs warnings for partial failures.
- Admin tooling links random Stripe customers to Supabase (`server/server.js:1756-1837`) and lists unlinked ones (`server/server.js:1842-1877`).

## Data & Persistence

Supabase surfaces relevant to subscription management are documented in `_reports/schema.sql`. Key tables:

- **subscriptions**: Stripe linkage storing `status`, `price_id`, and `current_period_end` (`server/server.js:964-1400`, `1756-1828`).
- **user_settings**: subscription-adjacent UI preferences (`server/server.js:3331-3388`, `3391-3527`).
- **audit_log**: write denials stored for observability (`server/server.js:328-430`).

Migration snippet enforcing cascading deletes is preserved (`_reports/schema.sql`, top section).

## Configuration & Environment

Complete environment inventory: `_reports/env.json`. Key points:

- Critical secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Operational flags: `FEATURE_EMPLOYEES`, `AGENT_BLOCK_READS`, `DEV_BYPASS`, `AUDIT_PAYLOAD_MAX_CHARS`, `JSON_BODY_LIMIT`.
- Front-end Vite vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE`, `VITE_API_STREAM_BASE`, `VITE_ENABLE_CUSTOM_BONUS_EDITOR`, `VITE_APP_URL`.
- `PUBLIC_APP_BASE_URL` powers Stripe redirect URLs (`server/server.js:36`).

The SPA runtime bridges these vars into `window.CONFIG` (`app/src/runtime-config.js:5-55`) ensuring no service-role keys leak to the browser.

## Tooling, Builds & Tests

- Root scripts (`package.json`) orchestrate workspace builds via `npm-run-all` (e.g., `npm run dev`, `npm run build`, `npm run preview`).
- `scripts/clean-dists.mjs` removes all generated `dist/` folders (`scripts/clean-dists.mjs:6-44`).
- `scripts/smoke-spa.mjs` imports SPA renderers to assert minimum HTML output (`scripts/smoke-spa.mjs:1-23`).
- Server tests:
  - `npm --workspace server run test` executes `tests/auth.test.js` and subscription-critical validation in `tests/auth.test.js`.
- A manual billing probe script lives at `server/test-secure-billing.js` for Stripe/Supabase hardening.

## Error Handling & Observability

- API responses follow `{ ok?: boolean, error?: string }` conventions with HTTP codes (see `/api/checkout` error branches `server/server.js:720-740`, etc.).
- Sensitive headers/bodies are redacted before auditing via `deepRedact` (`server/server.js:244-320`).
- Audit entries land in Supabase `audit_log` when available, otherwise in-memory circular buffer (`server/server.js:300-332`).
- `/metrics` surfaces AI-agent denial counters in Prometheus format (`server/server.js:437-452`).
- Logging uses scoped prefixes (`[auth]`, `[billing]`, `[webhook]`) and avoids leaking secrets.

## Security Posture

- CORS restricts origins to localhost dev ports and `*.kkarlsen.dev|.art` (`server/server.js:48-66`). Preflight routes are explicitly registered to avoid Express 5 behaviour changes (`server/server.js:73-90`).
- Auth relies on ES256 JWT verification against a remote JWKS (`server/lib/auth/verifySupabaseJwt.js:4-36`). Unauthorized requests return 401 with minimal stack info.
- `blockAgentWrites` stops AI-designated JWTs from mutating state and optionally reading if `AGENT_BLOCK_READS=true` (`server/server.js:3167-3199`).
- Stripe metadata enforces `supabase_uid` on customers, sessions, and subscriptions to prevent identity confusion (`server/server.js:461-752`).
- Webhook handler refuses to process events lacking a verified UID (`server/server.js:1518-1536`).
- Secrets are never logged; audit redaction masks headers like `authorization`.

## Rebuild in Next.js Plan

### Proposed `app/` Directory Structure

```
app/
  layout.tsx
  page.tsx                    # Dashboard (current SPA default)
  login/page.tsx
  onboarding/page.tsx
  abonnement/page.tsx
  ansatte/page.tsx
  shifts/
    page.tsx
    add/page.tsx
    [id]/edit/page.tsx
  statistikk/page.tsx
  settings/
    page.tsx                  # Shell with tabs
    account/page.tsx
    interface/page.tsx
  api/
    billing/start/route.ts
    checkout/route.ts
    portal/route.ts
    portal/upgrade/route.ts
    stripe/create-portal-session/route.ts
    stripe-webhook/route.ts   # edge=‘node’ to keep raw body
    admin/
      link-customer/route.ts
      unlinked-customers/route.ts
    audit-log/recent/route.ts
    settings/route.ts
  middleware.ts               # Auth guard / agent blocking
  lib/
    supabase-server.ts        # Supabase service-role client
    supabase-client.ts        # Browser client via createClient
    auth.ts                   # JWT verification utilities
    stripe.ts                 # Stripe SDK singleton
    agent-guard.ts            # AI agent detection helper
```

### Route Mapping

| Current Express Route                                                                                       | Next.js Route Handler                           | Notes                                                                     |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `POST /api/billing/start` (`server/server.js:461`)                                                          | `app/api/billing/start/route.ts` (POST)         | Use `NextRequest` + service-role Supabase admin; preserve UID validation. |
| `POST /api/checkout` & `/checkout` (`server/server.js:618`, `775`)                                          | `app/api/checkout/route.ts` (POST)              | Legacy path can redirect or share handler with rewrites.                  |
| `POST /api/portal` & `/portal` (`server/server.js:855`, `1352`)                                             | `app/api/portal/route.ts` (POST)                | Handle both proxies; respond JSON.                                        |
| `POST /api/stripe/create-portal-session` & `/stripe/create-portal-session` (`server/server.js:973`, `1066`) | `app/api/stripe/create-portal-session/route.ts` | Share logic with portal route.                                            |
| `POST /api/portal/upgrade` & `/portal/upgrade` (`server/server.js:1134`, `1277`)                            | `app/api/portal/upgrade/route.ts`               | Keep `no-active-subscription` semantics.                                  |
| `POST /api/stripe-webhook` (`server/server.js:1443`)                                                        | `app/api/stripe-webhook/route.ts` (POST)        | Opt into `dynamic = 'force-dynamic'` and `body = 'raw'`.                  |
| User settings (`server/server.js:3331-3527`)                                                                | `app/api/settings/route.ts` (GET/PUT)           | Use `NextResponse.json`.                                                  |
| Admin diagnostics (`server/server.js:1756-1877`)                                                            | `app/api/admin/...`                             | Protect via middleware verifying `role === 'admin'`.                      |
| Metrics (`server/server.js:437`)                                                                            | `app/api/metrics/route.ts`                      | Return `text/plain`.                                                      |

Front-end SPA routes translate into Next.js route segments shown above. Stateful legacy DOM modules can migrate gradually into React server components or client components under `app/`.

### Data Fetching & Rendering Strategy

- **Dashboard / subscription overview**: Use React Server Components with `fetch` to the new route handlers; cache per-user with `revalidateTag` keyed on user ID. Mutations (e.g., portal actions) should use `no-store` requests.
- **Account settings**: Server Component loader to prefetch via `cookies().get('sb-access-token')` or call Supabase directly on the server using session cookies. Provide `POST` forms or server actions for updates.
- **Auth-guarded pages**: Implement `middleware.ts` that verifies Supabase JWT (similar to `authMiddleware`) on the Edge/runtime and redirects unauthenticated users to `/login`.
- **Billing flows**: Keep Route Handlers on the default Node runtime (not Edge) due to Stripe’s SDK requirements. Trigger them from Client Components using `fetch` with `cache: 'no-store'`.
- **Caching**: Use `fetch({ cache: 'no-store' })` for billing endpoints, `revalidate = 0` for settings, and `revalidate = 60` for read-only analytics (if any). The metrics endpoint can stay uncached.

### Middleware & Auth Strategy

- `middleware.ts` intercepts `/app` routes, extracts Supabase access token from cookies/headers, verifies via `jose` (reuse `verifySupabaseJWT` logic), sets `request.headers.set('x-user-id', sub)`, and redirects to `/login` if invalid.
- Agent detection (`ai_agent` claim) can set `request.headers.set('x-ai-agent', '1')`; route handlers and React Server Components can read this to enforce read/write blocks.
- API routes share a `withAuth` helper that reads validated user context from `NextRequest` headers to mirror `authenticateUser` semantics.
- Stripe webhook route opts out of middleware to preserve raw body.

### Environment Setup & Parity

- Define `.env.local` with Supabase/Stripe vars mirrored from `_reports/env.json`.
- In Next.js, expose only safe vars via `NEXT_PUBLIC_*` (e.g., rename `VITE_SUPABASE_URL` to `NEXT_PUBLIC_SUPABASE_URL`). Server-only secrets remain un-prefixed.
- Configure `next.config.js` rewrites for legacy `/checkout` and `/portal` paths if clients still emit them during migration.

### Phased Migration & Rollback

1.  **Prepare Shared Utilities**: Extract auth helpers (`verifySupabaseJWT`, `blockAgentWrites`) into reusable modules consumed by both Express and Next route handlers.
2.  **Lift Frontend**: Scaffold Next.js app directory, migrate static marketing pages, then port SPA routes to React components using existing logic incrementally.
3.  **Dual-Run API**: Introduce Next.js API route handlers behind `/next/api/*`, mirror responses, and gradually switch the SPA to the new endpoints via feature flags.
4.  **Switch Traffic**: Once parity confirmed, update client `API_BASE` to point at Next.js, and retire Express routes.
5.  **Decommission Express**: Remove legacy server once all consumers hit Next.js handlers.

**Rollback Plan**: Maintain Express server alongside Next.js during migration. Environment flag can toggle which API base the SPA uses (`window.CONFIG.apiBase`). If Next.js handlers malfunction, point clients back to Express instantly. Keep Stripe webhook pointing at Express until the new handler is verified in staging.

### Risks & Unknowns

1.  **Realtime expectations**: SPA imports `app/src/realtime/client.js`, but no server websocket endpoint exists—confirm whether a separate service handles this before porting.
2.  **Supabase RLS parity**: Ensure inferred schema matches actual DB (see `_reports/schema.sql`). Any drift will break Next.js server actions relying on service-role keys.
3.  **Session propagation**: Decide whether to continue using Supabase’s client session cookies or adopt NextAuth/Auth Helpers for Next.js.
4.  **Stripe webhooks**: Next.js needs `bodyParser: false` equivalent; confirm hosting platform (e.g., Vercel) supports raw body streaming for Node runtime.

### Test Plan for Migration

- Mirror existing Node tests as Jest/Playwright suites targeting Next.js handlers.
- Add integration tests for billing flows using mocked Stripe (e.g., `stripe-mock`) to validate metadata requirements.
- Snapshot tests for Next.js pages to ensure route-level rendering matches SPA output (use `@testing-library/react`).
- Manual Stripe webhook replay against staging Next.js endpoint prior to production cut-over.

## Open Questions

- The realtime WebSocket client expects a server channel—confirm whether a separate service (e.g., Supabase Realtime) powers this and document the endpoint.
- Exact Supabase schema (indexes, enums, default values) should be exported to replace the inferred statements in `_reports/schema.sql`.
- Clarify AI agent onboarding: how are `ai_agent` claims issued, and should Next.js middleware short-circuit earlier?
- Determine whether marketing/legal assets require localisation changes during migration (shared legal modal exists in both SPA and marketing).

---

**Reports**: `_reports/routes.json`, `_reports/env.json`, `_reports/schema.sql`, `_reports/graph.md` complement this document.
