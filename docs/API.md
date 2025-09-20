## API Overview

Base URL:
- Production (app): set `VITE_API_BASE` to the API origin (e.g., `https://server.kkarlsen.dev`).
- Local: `http://localhost:3000` (set `VITE_API_BASE` accordingly). In dev, `app/vite.config.js` can proxy `/api` to your backend.

Notes on prefixes and proxies:
- The backend exposes some endpoints both with and without the `/api` prefix to support proxies in dev. In production, prefer calling the absolute `VITE_API_BASE` without relying on a proxy.

Full schema: see `docs/OPENAPI.yaml`.

### Auth
- JWT Bearer tokens from Supabase Auth are required for protected routes.
- The server validates with `jose` using JWKS from `${SUPABASE_JWKS_URL}` (default `https://id.kkarlsen.dev/auth/v1/.well-known/jwks.json`) and restricts algorithms to `ES256`.

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
- `POST /api/checkout` — Create a Stripe Checkout session and return the hosted checkout URL (auth required; AI agents blocked)

### Chat Assistant
- Client example (streaming): see `app/js/app.js`.

Tool naming consistency and outputs (assistant-side):
- addShift: `shift_date`, `start_time`, `end_time` (YYYY-MM-DD, HH:mm)
- addSeries: `from_date`, `to_date`, `days`, `start`, `end` (YYYY-MM-DD, HH:mm)
- getShifts (date range): `from_date`, `to_date` → returns JSON `{ period, shifts: [...], summary: { totalShifts, totalHours, totalEarnings } }`
- editShift updates: `new_shift_date`, `new_start_time`, `new_end_time`, `new_shift_type`

Dates use `YYYY-MM-DD` and times use `HH:mm`.

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




### Checkout (Stripe)

- Route: `POST /api/checkout`
- Auth: Bearer JWT required
- Body:
  - `priceId` (string, required): Stripe Price ID
  - `mode` (string, optional): `'subscription'` (default) or `'payment'`
  - `quantity` (integer, optional): defaults to `1` (range `1..999`)
- Response: `{ url: string }` — the Stripe-hosted Checkout URL
- Redirects: user is sent back to `index.html?checkout=success` or `?checkout=cancel`
- Notes:
  - `metadata.user_id` and `client_reference_id` are set to the authenticated Supabase `user_id`.
  - The server uses `APP_BASE_URL` (if set) or derives origin from `X-Forwarded-*` headers to build success/cancel URLs.
  - The frontend shows a toast on return based on the `checkout` query param and then cleans it from the URL.

Example (production via Netlify proxy):

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_123",
    "mode": "subscription",
    "quantity": 1
  }' \
  https://your-frontend-domain.com/api/checkout
```

Example (local backend):

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_123","mode":"payment","quantity":2}' \
  http://localhost:3000/api/checkout
```

Client examples

```js
// React/JS example (uses Supabase for auth)
import { supabase } from '/src/supabase-client.js'

async function startCheckout(priceId, { mode = 'subscription', quantity = 1 } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ priceId, mode, quantity })
  });
  const { url } = await res.json();
  window.location.href = url; // redirect to Stripe Checkout
}

// Example buttons
<button onClick={() => startCheckout('price_1RzQ85Qiotkj8G58AO6st4fh')}>
  Subscribe to Pro
  </button>
<button onClick={() => startCheckout('price_1RzQC1Qiotkj8G58tYo4U5oO')}>
  Subscribe to Max
</button>
```

```html
<!-- Vanilla JS example using helper -->
<script type="module">
  import { startCheckout } from '/src/js/checkout.js'
  document.getElementById('buyPro').addEventListener('click', () =>
    startCheckout('price_1RzQ85Qiotkj8G58AO6st4fh')
  )
  document.getElementById('buyMax').addEventListener('click', () =>
    startCheckout('price_1RzQC1Qiotkj8G58tYo4U5oO')
  )
</script>
<button id="buyPro">Subscribe to Pro</button>
<button id="buyMax">Subscribe to Max</button>
```

### Settings

- Routes: `GET /settings`, `PUT /settings` (also `GET /api/settings`)
- Auth: Bearer JWT required

- GET response shape:

```json
{
  "custom_wage": 200,
  "profile_picture_url": "https://.../avatar.jpg",
  "show_employee_tab": true
}
```

- PUT request body (all fields optional; validated types):

```json
{
  "custom_wage": 200,
  "profile_picture_url": null,
  "show_employee_tab": true
}
```

- Notes:
  - `show_employee_tab` controls visibility of the “Ansatte” tab in the app’s tab bar.
  - It only takes effect for users with an active Enterprise (max) subscription; for others the tab remains hidden regardless.
  - When absent, the server returns `show_employee_tab: true` as a default.
  - The server degrades gracefully if legacy schemas don’t yet include this column.
