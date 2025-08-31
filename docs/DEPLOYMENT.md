## Deployment

### Frontend (Netlify)

- Marketing site: root `netlify.toml` builds `marketing/` and publishes `marketing/dist`. Includes SPA fallback and a redirect from `/kalkulator/*` to the app domain.
- App site: configure a separate site with base directory `app/`. Use `app/public/_redirects` or a site-level `netlify.toml` for SPA fallback. Set `VITE_*` envs in the app site.
- Do not set server-only secrets in either site; only `VITE_*` belong in frontend envs.

### Backend (Azure Web App)

- GitHub Actions workflow: `.github/workflows/azure-webapp.yml`.
- Pipeline steps:
  - Checkout and setup Node 22
  - Install `server/` dependencies
  - Security scan for leaked keys in client code
  - Azure login and app settings configuration
  - Deploy `server/` directory to Web App `wageapp-prod`
- App settings configured by the pipeline:
  - `NODE_ENV=production`
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`
  - `ENABLE_STATIC=false`, `STATIC_DIR='.'`
  - `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
  - Runtime: `NODE|22-lts`

Backend server binds `PORT` (default 3000). Azure provides `PORT` automatically.

### Local Production-like Test

Run backend locally on port 3000 and point the frontend to it:

```bash
cd server && npm start
# in another shell (app)
cd app && VITE_API_BASE=http://localhost:3000 npm run dev
```

If you run the frontend against production while testing server locally, ensure your browser is calling the intended base (avoid mixed content/CORS).


