## API Overview

Base URL:
- Production (via Netlify proxy): `/api`
- Local: `http://localhost:3000` (set `VITE_API_BASE` accordingly)

Notes on prefixes and proxies:
- In production, Netlify proxies `/api/*` to the Azure backend and strips the `/api` prefix (`/api/chat` → Azure `/chat`).
- Locally, set `VITE_API_BASE=http://localhost:3000` so the client calls the backend directly without an `/api` prefix (e.g. `http://localhost:3000/chat`).
- The backend exposes some endpoints both with and without the `/api` prefix (e.g. `GET /api/employees` and `GET /employees`), but most newer endpoints are defined without `/api`. Prefer calling under your configured base URL.

Full schema: see `docs/OPENAPI.yaml`.

### Auth
- JWT Bearer tokens from Supabase Auth are required for protected routes.
- The server validates with JWKS from `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.

### Notable Endpoints

- `GET /config` — Returns feature flags and client config hints
- `GET /org-settings` — Get organization settings (e.g., break policy)
- `PUT /org-settings` — Update organization settings
- `GET /employees` — List employees (manager-owned placeholders)
- `POST /employees` — Create employee
- `PUT /employees/:id` — Update employee
- `DELETE /employees/:id` — Archive employee
- `GET /employee-shifts` — List employee shifts
- `POST /employee-shifts` — Create employee shift
- `PUT /employee-shifts/:id` — Update employee shift
- `DELETE /employee-shifts/:id` — Delete employee shift
- `GET /shifts` — Personal planner shifts for the current user (simpler model)
- `POST /shifts` — Create personal planner shift
- `PUT /shifts/:id` — Update personal planner shift
- `DELETE /shifts/:id` — Delete personal planner shift
- `GET /settings` — Get current user settings
- `PUT /settings` — Update current user settings
- `POST /user/avatar` — Upload user avatar (stored in Supabase Storage via server)
- `GET /metrics` — Prometheus metrics
- `GET /audit-log/recent` — Admin-only recent audit entries (requires `role=admin` claim)
- `GET /reports/wages` — CSV export of employee wages (auth required, AI agents blocked)

### Chat Assistant
- `POST /chat` supports both streaming (SSE) and non-streaming responses.
- Requires `OPENAI_API_KEY` server-side.
- Client example (streaming): see `kalkulator/js/app.js`.

SSE event protocol (when `stream=true`):
- `text_stream_start` — start of text streaming
- `text_chunk` — incremental content chunks (`content` field)
- `text_stream_end` — end of text streaming (final text accumulated on client)
- `shifts_update` — optional; updated shifts array for UI refresh
- `status`, `gpt_response`, `tool_calls_start`, `tool_call_start`, `tool_call_complete` — progress/status signals for UX

### Example: Create Employee (local backend)

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ola Nordmann","tariff_level":3}' \
  http://localhost:3000/employees
```

### Authorization and Admin
- Admin-only routes (e.g., `/audit-log/recent`) require the user to have `role: 'admin'` in the Supabase JWT (either the top-level `role` or `app_metadata/user_metadata.role`).




