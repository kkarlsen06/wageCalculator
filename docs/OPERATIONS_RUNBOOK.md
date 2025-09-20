## Operations Runbook

### Health Checks
- `GET /health` — liveness probe; should always return 200 if process is up
- `GET /health/deep` — optional DB ping; returns `db: 'disabled'` if Supabase envs are not set

### Metrics
- `GET /metrics` — Prometheus-format metrics
- Includes counters for AI-agent write denials and other app-specific metrics

### Logs
- Morgan request logs: `combined` in production, `dev` in development
- Server logs sensitive data redacted in audit payloads

### Authentication Issues
- In non-production, `GET /auth/debug` can confirm `Authorization` header pass-through
- Ensure proxies (Netlify/Azure) forward the `Authorization` header to the backend
  - Netlify proxy in `netlify.toml` forwards headers; verify any CDN/WAF in front also preserves them

### Feature Flags
- `GET /config` — used by the client to enable/disable UI features (e.g., Employees)
- Controlled by environment variables like `FEATURE_EMPLOYEES`

### Common Incidents
- Missing Supabase envs → DB features disabled (check logs for `[BOOT] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set`)
- CORS failures → set `CORS_ORIGINS` appropriately
  - For local dev: include `http://localhost:5173`

### Backups & Data
- Data is in Supabase Postgres; use Supabase backups/export tooling
- File uploads (avatars) stored in Supabase Storage (`profile-pictures` bucket)


