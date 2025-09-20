## Troubleshooting

### 1) Frontend can’t reach API locally
- Symptom: Calls go to production Azure endpoint
- Fix: Create `.env.local` with `VITE_API_BASE=http://localhost:3000` and restart Vite
- Tip: Open the console and verify `[boot] supabase vite client url=…` and `window.CONFIG.apiBase` are as expected

### 2) 401 Unauthorized on protected routes
- Ensure the client is authenticated with Supabase and is sending `Authorization: Bearer <access_token>`
- In dev, hit `/auth/debug` with your token to verify header propagation

### 3) CORS errors
- Set `CORS_ORIGINS` on the backend to include the origin of your frontend (e.g., `http://localhost:5173`)

### 4) OpenAI features not working

### 5) Avatar uploads fail
- Ensure Supabase Storage bucket `profile-pictures` exists and the service role has permission
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### 6) Employee name duplicates
- The API normalizes names (e.g., `anne-marie o'neill` → `Anne-Marie O'Neill`)
- Duplicate detection uses normalized names per manager

### 7) Proxy strips Authorization header
- Netlify and Azure should forward `Authorization` unchanged
- Verify via `/auth/debug` and adjust proxy rules if missing
- If using an additional CDN/WAF, ensure it does not remove `Authorization` headers on 200/301 responses


