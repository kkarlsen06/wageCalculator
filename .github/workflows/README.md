Workflows for Azure Web App deploys

Overview
- Two workflows manage the backend App Service:
  - Configure Azure Web App: one‑time/occasional config of the app and staging slot.
  - Deploy to Azure Web App: automatic zero‑downtime deploys via staging → production swap.

Secrets and naming
- Required repo secrets: `AZURE_CREDENTIALS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`.
- Resource names used:
  - Resource group: `rg-wageapp`
  - App Service name: `wageapp-prod`
  - Staging slot: `staging`
- Update names in the YAML files if your Azure resources differ.

One‑time setup (run before first deploy)
1) Go to GitHub → Actions → Configure Azure Web App.
2) Click Run workflow (branch: `main`).
3) This will:
   - Create `staging` slot if missing.
   - Mirror app settings/runtime to staging.
   - Enable Always On and set Health Check path to `/config` for both slots.
   - Wait for SCM/Kudu to stabilize.

Routine deploys (automatic)
- Trigger: push to `main` with changes under `server/**` or manual run of “Deploy to Azure Web App”.
- Steps performed:
  - Deploy package `./server` to `staging` (with retry/backoff).
  - Warm up staging by polling `https://wageapp-prod-staging.azurewebsites.net/config`.
  - Swap `staging` → `production` for near zero downtime.
  - Verify production health at `/config`.

If deployment slots are unavailable
- Deployment slots require App Service plan SKU Standard (S1) or higher. Basic SKU does not support slots.
- The deploy workflow auto-detects this and falls back to direct-to-production deploy with retries. This may cause a brief interruption during restarts.

Upgrade to enable zero-downtime swaps
- Determine the App Service plan:
  - `az webapp show -g rg-wageapp -n wageapp-prod --query serverFarmId -o tsv`
- Upgrade the plan to Standard (example using plan name `wageapp-plan`):
  - `az appservice plan update -g rg-wageapp -n wageapp-plan --sku S1 --is-linux`
- Re-run the "Configure Azure Web App" workflow afterwards to create/configure the `staging` slot.

When to re‑run Configure workflow
- Any change to app settings, runtime version, health check path, or if slot drift is suspected.

Rollback
- Use Azure CLI or Portal to swap slots back if needed:
  - `az webapp deployment slot swap -g rg-wageapp -n wageapp-prod --slot production --target-slot staging`

Health endpoint
- The workflows use `GET /config` as the health check.
- If you add a dedicated `/healthz` route, update both YAML files accordingly.

Notes
- Concurrency guards ensure only one deploy/config run executes at a time.
- Deploy workflow uses retries to avoid transient Kudu/SCM restarts.
