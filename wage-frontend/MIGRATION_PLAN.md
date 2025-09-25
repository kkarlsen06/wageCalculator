# Wage Frontend Migration Plan

## Objective

- Rebuild the legacy Vite SPA in `app/` inside the Next.js workspace (`wage-frontend/`).
- Deliver feature parity for payroll, subscription, and settings flows without regressions to auth, offline sync, or Stripe integrations.
- Keep the Express API (`server/`) as the backend of record during the migration; avoid breaking existing `/api` consumers.

## Source References

- Architecture & route inventory: `codebase.md`, `_reports/routes.json`, `_reports/graph.md`
- Environment contract: `_reports/env.json`
- Legacy implementation entrypoints: `app/src/kalkulator.js`, `app/src/router.js`, `app/src/js/*`

## Current Snapshot (January 2025)

- **Legacy SPA (`app/`)**: DOM-driven router, Supabase auth, offline queue, Stripe checkout helpers, and theme/pwa bootstrapping wired through `kalkulator.js`.
- **Next.js workspace (`wage-frontend/`)**:
  - ✅ Foundation: Next.js 15 app router, environment validation (`src/lib/env.ts`), app config, Supabase browser/server clients, Zustand stores, shared API client, middleware-based auth redirect, and design-system components.
  - ✅ Auth page: `/login` implements Supabase email/password login with remember-me, status messaging, and profile hydration via the new stores.
  - ⏳ Shell routes (`/`, `/onboarding`, `/settings`) exist but are placeholders and still show Create Next App boilerplate on `/`.
  - ⏳ No domain logic (shift management, employees, calculations, checkout) has been ported; offline/PWA flow not yet implemented.
  - ⏳ Service worker, config bootstrap (`window.CONFIG` parity), and Stripe actions are missing.

## Guiding Principles

- Preserve the JSON API contract and feature flags exposed by Express; the Next app should consume `window.CONFIG` (or server-fetched equivalent) before rendering gated UI.
- Convert legacy imperative modules into typed, composable React components; avoid sprinkling ad-hoc DOM manipulation.
- Keep calculations pure and co-locate business logic under `src/lib` mirroring `server/payroll/calc.js` patterns.
- Respect Supabase RLS by always scoping queries to the authenticated user ID provided by middleware/session helpers.
- Maintain offline friendliness (IndexedDB/localStorage queues) but modernise around React Query or Zustand where practical.

## Phase Overview

| Phase                     | Goal                                         | Key Deliverables                                                                                               |
| ------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 0. Baseline               | Remove boilerplate, align env + tooling      | Home layout scaffold, shared config bootstrap mirroring `runtime-config.js`, lint passes                       |
| 1. Auth & Shell           | Authenticated shell with navigation + config | `/app` layout, protected routes, profile dropdown, initial `/settings` + `/onboarding` content, global loaders |
| 2. Payroll Features       | Shift, employee, and calculation flows       | Port shift list/editor, employee carousel, calculator UI, subscription state hooks                             |
| 3. Billing & Integrations | Stripe + Supabase parity                     | Checkout/portal actions, subscription banners, audit logging hooks, file uploads (avatars)                     |
| 4. Offline & PWA          | Resilient offline behaviour                  | Service worker parity, offline queue, background sync, skeleton loaders                                        |
| 5. Hardening & Cutover    | Confidence to switch traffic                 | Regression tests, Lighthouse + Web Vitals, docs & runbooks updated, feature-flagged rollout                    |

## Phase Detail

- [x] Phase 0 – Baseline Alignment

* Replace `src/app/page.js` boilerplate with a redirect to `/app` (authenticated shell) or a landing stub that mirrors the SPA entry.
* Introduce a root configuration loader that mirrors `app/src/runtime-config.js` (fetch `/config`, hydrate feature flags, inject into context or React Query cache).
* Wire global styles: move CSS module scaffolding into `src/app/globals.css` and delete unused Create Next App assets.
* Ensure lint & typecheck scripts reflect project reality (`npm run lint`, `tsc --noEmit`).
* [ ] Phase 1 – Authenticated Shell

* Build `/app/(authenticated)/layout.tsx` with header, nav, and skeleton loader behaviour consistent with SPA classes (`html.spa-route`, `body.skeleton-active`).
* Port theme manager integration (`themeManager.js`, `themeIntegration.js`) into React context connected to existing design-system state.
* Implement session awareness: show profile data, logout menu, and guard routes using `useAuth()` store state.
* Flesh out `/settings` and `/onboarding` pages by translating the legacy DOM flows into React components. Reuse CSS modules already copied under `src/app`.
* [ ] Phase 2 – Payroll & Workforce Features

* Map `app/src/router.js` routes to Next segments under `/app` (e.g., `/app/dashboard`, `/app/shifts`, `/app/employees`, `/app/reports`).
* Translate core modules:
  - Shifts: `app/src/js/app.js`, `app/src/js/offline-queue.js`, and related helpers become React components/hooks managing `useDataStore`.
  - Employees: port `employeeCarousel.js`, `employeeModal.js`, `employeeActionsMenu.js` into the component system.
  - Wage calculations: implement pure helpers under `src/lib/payroll/` mirroring `server/payroll/calc.js` to keep calculations in sync.
* Integrate Supabase data fetching via server components (for initial render) and client hooks for live updates. Cache per user ID using tags.
* Replicate toast/dialog experiences using existing `Snackbar`, `Modal`, and `Button` components.
* [ ] Phase 3 – Billing & Subscription Integrations

* Recreate `subscriptionState.js`, `subscriptionUtils.js`, and `checkout.js` as typed hooks/services that call the Express billing endpoints (`/api/checkout`, `/api/portal`, etc.).
* Add CTA components that respect feature flags (`FEATURE_EMPLOYEES`, `VITE_ENABLE_CUSTOM_BONUS_EDITOR`).
* Implement status messaging for Stripe redirects (query-string parsing currently in `kalkulator.js`).
* Surface admin-only panels/shortcuts by checking `req.auth.user_role` proxies from middleware headers.
* [ ] Phase 4 – Offline & PWA Parity

* Port service worker registration & update prompts; use Next.js `appDir` + custom worker under `public/service-worker.js`.
* Rebuild offline queue + background sync using the Zustand stores and the existing IndexedDB schema; ensure writes debounce and retry.
* Reinstate `offline-debug-utils` in dev-only builds for parity.
* Verify skeleton loader toggles and `setAppHeight` measurements behave on mobile safe areas.
* [ ] Phase 5 – Hardening & Cutover

* Restore automated tests: migrate `/server/tests` analogues for client behaviour using Playwright or Vitest + Testing Library.
* Add integration smoke tests hitting the Express API via Next.js frontend flows.
* Run Lighthouse + WebPageTest; target ≥90 performance/accessibility.
* Update documentation: `docs/API.md`, `docs/ARCHITECTURE_AND_SNAPSHOTS.md`, `agents.md` summary, and this plan.
* Roll out behind a feature flag (`window.CONFIG.flags.useNextFrontend`); expose toggle in `server/server.js:/config` response.
* [ ] Cross-Cutting Workstreams

* **API & Data Layer**: Extend `src/lib/api` to wrap legacy endpoints (`/api/shifts`, `/api/employees`, etc.); centralise error mapping to `{ ok, error }` pattern used by Express.
* **State Management**: Expand Zustand stores (`auth`, `data`, `app`) with selectors for optimistic updates, syncing them with Supabase listeners.
* **Styling & Theming**: Keep CSS variable contract (`--surface-card`, `--shadow-card`) from SPA; document any divergences in `CSS_MIGRATION_SUMMARY.md`.
* **Accessibility & i18n**: Maintain Norwegian copy + aria labels; audit new components with axe before launch.
* [ ] Rollout Strategy

1. Develop in Next.js while SPA remains default (`app/` served by Vite).
2. Enable a dual-build stage where `/config` exposes the Next frontend URL for internal testers.
3. Gradually route percentage of authenticated users to Next via feature flag; monitor Supabase metrics and Stripe events.
4. Once stable, update marketing links (`VITE_APP_URL` / `NEXT_PUBLIC_API_URL`) and retire SPA build artifacts.

- [ ] Definition of Done

* All SPA routes replicated in Next and covered by smoke tests.
* Supabase auth/session continuity confirmed (middleware + client stores).
* Offline queue successfully replays actions after reconnect in staging.
* Stripe checkout and portal flows complete without console errors; webhook data matches Express expectations.
* Documentation and environment examples updated; old SPA build removed from deployment pipeline.
