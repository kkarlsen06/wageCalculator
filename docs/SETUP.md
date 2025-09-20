## Local Setup

Prerequisites:
- Node.js >= 22
- npm

Repository layout is multi-app: a Vite frontend at repo root and an Express backend under `server/`.

### Frontend (Vite)

1) Install deps and run the dev server:

```bash
npm install
npm run dev
# opens http://localhost:5173
```

2) API base and proxy during dev
- The Vite dev server contains a proxy for `/api` to the production Azure backend. The app’s client code, however, uses `window.CONFIG.apiBase` (from `src/runtime-config.js`).
- To use your local backend, set `VITE_API_BASE=http://localhost:3000` in a `.env.local`, restart Vite, and the client will call your local server (without `/api` prefix).

3) Environment for the client
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` if you want to point to your own Supabase project (defaults exist in `src/runtime-config.js`).

### Backend (Express)

1) Install deps and start the server:

```bash
cd server
npm install
npm start
# http://localhost:3000
```

2) Environment for the server (required)
- Create `server/.env` (or use your CI secrets) with at least:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

3) Auth debug (dev only)
When `NODE_ENV !== 'production'`, you can verify auth headers using:

```bash
curl -i http://localhost:3000/auth/debug -H "Authorization: Bearer <access_token>"
```

### Netlify preview (frontend)

- Netlify builds with `netlify.toml` and proxies `/api/*` to the Azure backend (prefix stripped upstream).
- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Netlify environment. Do not put server-only secrets in Netlify.


