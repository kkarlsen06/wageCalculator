- [x] **1. Config and secrets**

- Goal: A predictable way to read configuration in dev and prod.
- Do: Create `frontend/.env.local` for local values. Create `frontend/.env.example` with placeholders. Use `NEXT_PUBLIC_` only for values safe in the browser.
- Wire: `process.env.MY_SECRET` in route handlers only. `process.env.NEXT_PUBLIC_*` in client code.
- Check: `console.log(process.env.NEXT_PUBLIC_* )` renders in the browser. Server secrets never appear in page source.

- [x] **2. Core data model**

- Goal: Tables that match your app, with rules that block cross-user reads.
- Do: In Supabase, create `users`, `shifts`, `pay_rules`, `user_settings`, `audit_log`. Add primary keys, foreign keys, indexes.
- RLS: Enable RLS on all user data. Policies like “row.user_id = auth.uid()”.
- Seed: Insert 1 test user and a few shifts.
- Check: You can select only your rows when logged in. Queries are fast on indexed columns.

3. [x] **3. Identity and access**

- Goal: Users can sign in and the app knows who they are.
- Do: Add Supabase client in Next.js. Build simple pages: `/login`, `/logout`. Store session via Supabase helpers.
- Agent rules: If you plan bot access, store a claim like `ai_agent`.
- Check: Refresh keeps you signed in. `cookies()` on the server exposes the session. Unauthed users get redirected to `/login`.

4. [ ] **4. Security baseline**

- Goal: Safe defaults before building features.
- Do: CORS only for your domains. Add security headers in `next.config.mjs` via `headers()`. Verify JWT in middleware for protected paths.
- Logging: Redact `authorization`, `cookie`.
- Rate limit: Add a simple in-memory limiter on write actions during dev.
- Check: Forbidden origins fail. Protected pages redirect. Logs show no secrets.

5. [ ] **5. App UX skeleton**

- Goal: The shell of the app with navigation and error states.
- Do: Set up `app/layout.tsx`, a top nav or bottom tab, and route folders for dashboard, shifts, statistics, settings.
- States: Add `loading.tsx` and `error.tsx` in key routes. Create placeholder content.
- Design: Import your base CSS once. Add a Button and Card to prove styling works.
- Check: All pages load with no real data yet. Back/forward works. Errors render cleanly.

6. [ ] **6. Wage engine MVP**

- Goal: Correct monthly totals from real shift rows.
- Do: CRUD for `shifts` with start, end, break. Server functions to compute hours, overtime, bonuses, deductions, monthly sum.
- Rules: Centralize math in one file. Write unit tests on those pure functions.
- UI: Dashboard shows current month summary from the engine.
- Check: Create, edit, delete shifts. Totals update. Math matches a hand calculation.

7. [ ] **7. Tooling and tests**

- Goal: Fast feedback and a guardrail.
- Do: Add ESLint, TypeScript strict, and a test runner (Vitest or Jest). Add Testing Library for components. Add Playwright for one happy-path.
- Scripts: `dev`, `build`, `test`, `lint`, `e2e`.
- Check: `npm test` runs unit tests. One E2E opens app, logs in, creates a shift, sees a total.

8. [ ] **8. Observability**

- Goal: You can detect failures quickly.
- Do: Add a simple health route under `app/api/health/route.ts`. Add structured logs with consistent prefixes. Add a minimal metrics endpoint or a log counter for key errors.
- Alerts: For now, print loud logs on auth or billing failures.
- Check: Health returns 200. Logs show request ids. Common errors have one clear message.

9. [ ] **9. Plans and billing**

- Goal: Users can pay and get features.
- Do: Create Stripe products and prices. Build a “Start trial” or “Subscribe” button. Add a Webhook handler that syncs `subscriptions`.
- Portal: Add “Manage billing” link. Show current plan in settings.
- Check: Checkout redirects and returns. Webhook writes the right user row. Plan gates take effect.

1. [ ] **10. Admin surface**

- Goal: Minimal controls you need in production.
- Do: Add an admin page gated by role. Tools to link stray Stripe customers, view recent audits, toggle feature flags.
- Check: Non-admins cannot load it. Actions are logged.

1. [ ] **11. Marketing site**

- Goal: A public entry that explains the product.
- Do: Landing page, pricing, basic FAQ, legal pages. Reuse brand styles. Add an install CTA if you want a PWA later.
- Check: Lighthouse is decent. Links point to app auth.

1. [ ] **12. Rollout and recovery**

- Goal: You can ship and roll back without pain.
- Do: Feature flags for risky paths. Keep a toggle for old API if you have one. Write a short rollback doc with exact env changes.
- Check: Flip a flag to disable billing UI. Flip another to switch API base. Document both.

Tip for each step

- When stuck, add the smallest working slice, commit, then iterate.
- Keep secrets out of `NEXT_PUBLIC_*`.
- Keep all wage math in pure functions with tests. This prevents regressions.
