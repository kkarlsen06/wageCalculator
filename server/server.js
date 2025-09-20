// ===== server.js =====

import dotenv from 'dotenv';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Boot check for Stripe configuration
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("[boot] STRIPE_SECRET_KEY missing");
}


import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';
import { calcEmployeeShift } from './payroll/calc.js';
import { randomUUID } from 'node:crypto';
import { verifySupabaseJWT, getUidFromAuthHeader } from './lib/auth/verifySupabaseJwt.js';
import { authMiddleware } from './middleware/auth.js';
import Stripe from 'stripe';
import { createRemoteJWKSet, jwtVerify } from 'jose';
// Node 22+ has global fetch; use Stripe REST API to avoid extra deps

// ---------- path helpers ----------
const FRONTEND_DIR = __dirname;

// Public base URL for the app (used in Stripe redirects)
// Prefer env var to allow staging/preview environments
const APP_BASE_URL = process.env.PUBLIC_APP_BASE_URL || 'https://kalkulator.kkarlsen.dev';

// ---------- app & core middleware ----------
const app = express();

// Health check route for Render
app.get('/health', (_req, res) => res.send('ok'));

// Request logging with Morgan
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// CORS: allow dev frontend and production domains; skip Stripe webhook (must stay raw)
const ALLOW_ORIGINS = [
  // Local dev
  /^http:\/\/localhost:(4173|5173|3000)$/, // Vite + dev server
  /^http:\/\/127\.0\.0\.1:\d+$/,           // loopback

  // Any subdomain (and bare) on your prod domains
  /^https:\/\/([a-z0-9-]+\.)?kkarlsen\.dev$/,
  /^https:\/\/([a-z0-9-]+\.)?kkarlsen\.art$/,
  // Custom domain for server
  'https://server.kkarlsen.dev',
];

 const corsOptions = {
   origin: (origin, cb) => {
     if (!origin) return cb(null, true); // curl/same-origin
     const ok = ALLOW_ORIGINS.some(re => re.test(origin));
     return ok ? cb(null, true) : cb(new Error('Not allowed by CORS'));
   },
   credentials: true,
   methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
   allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
 };

// Explicit preflight for /api/checkout to avoid Express auto-OPTIONS
app.options('/api/checkout', cors(corsOptions));
// Explicit preflight for /api/portal (Stripe Billing Portal)
app.options('/api/portal', cors(corsOptions));
// Explicit preflight for dedicated upgrade route
app.options('/api/portal/upgrade', cors(corsOptions));
// Also allow preflight for /portal (when proxies strip /api)
app.options('/portal', cors(corsOptions));
// Back-compat preflight when proxies strip /api for upgrade route
app.options('/portal/upgrade', cors(corsOptions));
// Explicit preflight for new portal session route
app.options('/api/stripe/create-portal-session', cors(corsOptions));
// Back-compat preflight when proxies strip /api for portal session route
app.options('/stripe/create-portal-session', cors(corsOptions));



// Also allow preflight for /checkout (when proxies strip /api)
app.options('/checkout', cors(corsOptions));

// Explicit preflight for DELETE shifts endpoint
app.options('/shifts/outside-month/:month', cors(corsOptions));

// Chat endpoints rely on global OPTIONS handler with CORS; no explicit mapping needed


// Do NOT apply to /api/stripe-webhook (keep express.raw)
app.use((req, res, next) => {
  if (req.path === '/api/stripe-webhook') return next();
  return cors(corsOptions)(req, res, next);
});

// Ensure preflight succeeds (Express 5 safe handler)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    if (req.path === '/api/stripe-webhook') return res.sendStatus(204);
    return cors(corsOptions)(req, res, () => res.sendStatus(204));
  }
  next();
});

// Use JSON parser for all routes except Stripe webhook (needs raw body)
const _jsonParser = express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' });
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe-webhook') return next();
  return _jsonParser(req, res, next);
});
// ---------- liveness & deep health ----------
// Liveness: skal ALLTID svare 200 så lenge prosessen lever
app.get('/health', (_req, res) => res.status(200).send('ok'));

// Enkel timeout-wrapper for dype sjekker
const withTimeout = (p, ms = 800) => Promise.race([
  p,
  new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))
]);

// Valgfri dypsjekk: lett DB-ping
app.get('/health/deep', async (_req, res) => {
  if (!supabase) return res.status(200).json({ ok: true, db: 'disabled' });
  try {
    await withTimeout(
      supabase
        .from('employees')
        .select('id')
        .limit(1)
        .then(({ error }) => { if (error) throw error; })
    );
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

// ---------- API landing (root) ----------
// Always return JSON at '/'; do not redirect to frontend
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'kkarlsen wage calculator API',
    version: '1.0.0',
    main: 'https://www.kkarlsen.dev/',
    lastUpdated: new Date().toISOString()
  });
});

// ---------- Stripe client ----------
const stripe = (() => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn('[BOOT] STRIPE_SECRET_KEY not set – Stripe SDK features disabled.');
    return null;
  }
  try {
    return new Stripe(key, { apiVersion: '2024-06-20' });
  } catch (e) {
    console.warn('[BOOT] Failed to initialize Stripe client:', e?.message || e);
    return null;
  }
})();

// ---------- dev-only auth debug endpoint ----------
if (process.env.NODE_ENV !== 'production') {
  app.get('/auth/debug', authMiddleware, (req, res) => {
    try {
      const authz = req.headers.authorization || '';
      const userId = req?.auth?.userId || null;
      return res.status(200).json({ ok: true, userId, hasAuthorization: Boolean(authz) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e?.message || String(e), stack: e?.stack || null });
    }
  });
  app.get('/auth/session-echo', (req, res) => {
    try {
      const authz = req.headers.authorization || '';
      return res.status(200).json({ ok: true, hasAuthorization: Boolean(authz) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e?.message || String(e), stack: e?.stack || null });
    }
  });
}

// Ensure auth is enforced on key route groups
app.use('/api/settings', authMiddleware);
app.use('/api/employees', authMiddleware);
app.use('/settings', authMiddleware); // Legacy support
app.use('/employees', authMiddleware); // Legacy support
// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const admin = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey)
  : null;

// Backwards compatibility wrapper
const supabase = (() => {
  if (!supabaseUrl || !supabaseSecretKey) {
    console.warn('[BOOT] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set – DB features disabled.');
    return null;
  }
  try {
    return admin;
  } catch (e) {
    console.warn('[BOOT] Failed to initialize Supabase client:', e?.message || e);
    return null;
  }
})();
try {
  const mask = (s) => {
    if (!s) return '';
    const str = String(s);
    if (str.length <= 8) return str[0] + '…' + str[str.length - 1];
    return str.slice(0, 4) + '…' + str.slice(-4);
  };
  const host = (() => {
    try {
      return new URL(supabaseUrl).host;
    } catch (_) {
      return (supabaseUrl || '').toString();
    }
  })();
} catch (_) {}
// ---------- simple metrics & audit (in-memory fallback) ----------
const AGENT_BLOCK_READS = process.env.AGENT_BLOCK_READS === 'true';

// metrics storage: key `${route}|${method}|${reason}` -> count
const AGENT_WRITE_DENIED_COUNTS = new Map();

function incrementAgentWriteDenied(route, method, reason) {
  try {
    const key = `${route}|${method}|${reason}`;
    const current = AGENT_WRITE_DENIED_COUNTS.get(key) || 0;
    AGENT_WRITE_DENIED_COUNTS.set(key, current + 1);
  } catch (_) {
    // ignore metric failures
  }
}

const AUDIT_LOG_MEM = [];
const AUDIT_LOG_MEM_MAX = 1000;

function pickActorId(req) {
  try {
    if (req.user_id) return req.user_id;
    const payload = getJwtPayloadFromAuthHeader(req);
    return payload?.sub || payload?.user_id || null;
  } catch (_) {
    return null;
  }
}

// Keys that may contain secrets/PII and must be redacted (case-insensitive)
const SENSITIVE_AUDIT_KEYS = [
  'password',
  'pass',
  'passwd',
  'token',
  'secret',
  'api_key',
  'apikey',
  'authorization',
  'auth',
  'access_token'
];

// Max characters when serializing audit payload; can be overridden via env
const AUDIT_PAYLOAD_MAX_CHARS = Math.max(
  200,
  parseInt(process.env.AUDIT_PAYLOAD_MAX_CHARS || '2000', 10) || 2000
);

// Deeply redact sensitive keys in nested objects/arrays. Returns a safe copy.
function deepRedact(input, keysToRedact = SENSITIVE_AUDIT_KEYS) {
  try {
    const sensitive = new Set(keysToRedact.map(k => String(k).toLowerCase()));
    const seen = new WeakSet();

    function redact(value) {
      if (value === null || value === undefined) return value ?? null;

      const valueType = typeof value;
      if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return value;
      if (valueType === 'bigint') return value.toString();
      if (valueType === 'function') return '[Function]';
      if (value instanceof Date) return value.toISOString();
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer?.(value)) return `[Buffer length=${value.length}]`;

      if (Array.isArray(value)) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        return value.map(item => redact(item));
      }

      if (valueType === 'object') {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
        const result = {};
        for (const [key, val] of Object.entries(value)) {
          const lowered = String(key).toLowerCase();
          if (sensitive.has(lowered)) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = redact(val);
          }
        }
        return result;
      }

      try {
        return JSON.parse(JSON.stringify(value));
      } catch (_) {
        return String(value);
      }
    }

    return redact(input);
  } catch (_) {
    // On failure, avoid throwing from audit path
    return null;
  }
}

// Ensure the serialized payload is capped to maxChars. If too large or not
// serializable as JSON, return an object with a truncated string preview.
function capJsonForAudit(value, maxChars = AUDIT_PAYLOAD_MAX_CHARS) {
  try {
    const json = JSON.stringify(value);
    if (json.length <= maxChars) return value;
    return { truncated: true, preview: json.slice(0, maxChars) };
  } catch (_) {
    try {
      const str = String(value);
      if (str.length <= maxChars) return str;
      return { truncated: true, preview: str.slice(0, maxChars) };
    } catch {
      return null;
    }
  }
}

async function recordAgentDeniedAttempt(req, reason, status) {
  try {
    // Build a sanitized payload snapshot
    const sanitizedHeaders = deepRedact(req?.headers || {}, SENSITIVE_AUDIT_KEYS) || {};

    let sanitizedBody = null;
    try {
      if (req && Object.prototype.hasOwnProperty.call(req, 'body')) {
        if (req.body && typeof req.body === 'object') {
          sanitizedBody = deepRedact(req.body, SENSITIVE_AUDIT_KEYS);
        } else if (typeof req.body === 'string') {
          // Non-JSON body; store as a safe string indicator (no raw content)
          sanitizedBody = `[non-json body len=${req.body.length}]`;
        } else if (req.body != null) {
          sanitizedBody = String(req.body);
        }
      }
    } catch (_) {
      sanitizedBody = null;
    }

    let sanitizedQuery = null;
    try {
      sanitizedQuery = deepRedact(req?.query || {}, SENSITIVE_AUDIT_KEYS);
    } catch (_) {
      sanitizedQuery = null;
    }

    let sanitizedParams = null;
    try {
      sanitizedParams = deepRedact(req?.params || {}, SENSITIVE_AUDIT_KEYS);
    } catch (_) {
      sanitizedParams = null;
    }

    const rawAuditPayload = {
      body: sanitizedBody ?? null,
      headers: sanitizedHeaders,
      query: sanitizedQuery ?? null,
      params: sanitizedParams ?? null
    };

    const sanitizedPayload = capJsonForAudit(rawAuditPayload, AUDIT_PAYLOAD_MAX_CHARS);

    const payload = {
      id: randomUUID(),
      actor_id: pickActorId(req),
      route: req.baseUrl || req.originalUrl || req.path || '',
      method: (req.method || '').toUpperCase(),
      status: status || 403,
      reason: reason || 'agent_write_blocked_middleware',
      payload: sanitizedPayload ?? null,
      at: new Date().toISOString()
    };

    // Try to persist to DB if audit_log exists
    try {
      await supabase
        .from('audit_log')
        .insert({
          id: payload.id,
          actor_id: payload.actor_id,
          route: payload.route,
          method: payload.method,
          status: payload.status,
          reason: payload.reason,
          payload: payload.payload,
          at: payload.at
        });
    } catch (_) {
      // ignore; fall back to memory below
    }

    // Always keep an in-memory ring buffer for visibility even if DB write works
    AUDIT_LOG_MEM.push(payload);
    if (AUDIT_LOG_MEM.length > AUDIT_LOG_MEM_MAX) {
      AUDIT_LOG_MEM.shift();
    }
  } catch (_) {
    // ignore audit failures
  }
}

// Expose metrics in Prometheus format
app.get('/metrics', (req, res) => {
  try {
    const lines = [];
    lines.push('# HELP agent_write_denied_total Number of API attempts denied for AI agent');
    lines.push('# TYPE agent_write_denied_total counter');
    for (const [key, count] of AGENT_WRITE_DENIED_COUNTS.entries()) {
      const [route, method, reason] = key.split('|');
      const routeLabel = route.replace(/"/g, '\\"');
      const reasonLabel = reason.replace(/"/g, '\\"');
      lines.push(`agent_write_denied_total{route="${routeLabel}",method="${method}",reason="${reasonLabel}"} ${count}`);
    }
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.send(lines.join('\n') + '\n');
  } catch (e) {
    return res.status(500).send('');
  }
});

// ---------- Secure Billing Start Endpoint ----------
// Creates or updates Stripe Customer with secure UID and initiates checkout
// - Auth required; extracts UID from verified JWT
// - Ignores client-provided UID unless it matches server-verified UID
// - Sets metadata.supabase_uid on customers and sessions
// - Maintains server-side mapping table
app.post('/api/billing/start', async (req, res) => {
  try {

    // Extract UID from Authorization header (server-side verification)
    const uid = await getUidFromAuthHeader(req.headers.authorization);
    if (!uid) {
      return res.status(401).json({ error: 'Invalid or missing authentication token' });
    }

    // Log security check if client provided UID differs from server UID
    if (req.body.uid && req.body.uid !== uid) {
      console.warn(`[billing] Security: client UID=${req.body.uid} differs from server UID=${uid}`);
    }

    const { priceId, mode = 'subscription', quantity = 1 } = req.body || {};
    if (!priceId || typeof priceId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid priceId' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }

    // Get user details from Supabase for customer creation
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(uid);
    if (userError || !userData.user) {
      console.error('[billing] Failed to get user data:', userError);
      return res.status(400).json({ error: 'User not found' });
    }

    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || '';


    // Create or update Stripe customer with supabase_uid metadata
    let customerId = null;
    try {
      // First try to find existing customer by metadata
      const existingCustomers = await fetch(`https://api.stripe.com/v1/customers/search?query=metadata%5B%27supabase_uid%27%5D%3A%27${uid}%27&limit=1`, {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      const existingData = await existingCustomers.json();
      
      if (existingData.data && existingData.data.length > 0) {
        customerId = existingData.data[0].id;
        
        // Update customer to ensure metadata is current
        await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'metadata[supabase_uid]': uid,
            'email': userEmail,
            ...(userName && { 'name': userName })
          }).toString()
        });
      } else {
        // Create new customer with supabase_uid metadata
        const createResp = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${stripeKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'email': userEmail,
            'metadata[supabase_uid]': uid,
            ...(userName && { 'name': userName })
          }).toString()
        });
        
        if (!createResp.ok) {
          const errorData = await createResp.json();
          console.error('[billing] Customer creation failed:', errorData);
          return res.status(500).json({ error: 'Failed to create customer' });
        }
        
        const customerData = await createResp.json();
        customerId = customerData.id;
      }
    } catch (e) {
      console.error('[billing] Customer handling failed:', e);
      return res.status(500).json({ error: 'Customer processing failed' });
    }

    try {
        const { data, error: dbError } = await supabase
          .from('subscriptions')
          .upsert(
            { user_id: uid, stripe_customer_id: customerId },
            { onConflict: 'user_id', ignoreDuplicates: false }
          )
          .select();
        if (dbError) {
          console.warn('[billing] Database mapping upsert failed:', {
            message: dbError.message, details: dbError.details, hint: dbError.hint
          });
          // Continue anyway - Stripe metadata is source of truth
        } else {
        }
      } catch (dbErr) {
        console.warn('[billing] Database mapping error:', dbErr?.message || dbErr);
      }

    // Create Checkout Session with secure UID references
    const success_url = `${APP_BASE_URL}/index.html?checkout=success`;
    const cancel_url = `${APP_BASE_URL}/index.html?checkout=cancel`;
    
    const sessionPayload = new URLSearchParams({
      'mode': mode,
      'customer': customerId,
      'client_reference_id': uid, // UID for webhook recovery
      'success_url': success_url,
      'cancel_url': cancel_url,
      'metadata[supabase_uid]': uid, // UID in session metadata
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': quantity.toString()
    });

    const sessionResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: sessionPayload.toString()
    });

    if (!sessionResp.ok) {
      const errorData = await sessionResp.json();
      console.error('[billing] Session creation failed:', errorData);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    const sessionData = await sessionResp.json();
    
    return res.json({ 
      url: sessionData.url,
      sessionId: sessionData.id,
      customerId 
    });

  } catch (error) {
    console.error('[billing] Exception:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- Stripe Checkout ----------
// Creates a Stripe Checkout Session for subscriptions.
// - Auth required; derives user_id from JWT (does not trust client-provided userId)
// - Blocks ai_agent writes per security model
// - Success/Cancel URLs redirect back to app with a `checkout` query flag
app.post('/api/checkout', authenticateUser, async (req, res) => {
  try {

    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/api/checkout', 'POST', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }

    const { priceId, mode: modeRaw, quantity: qtyRaw } = req.body || {};
    if (!priceId || typeof priceId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid priceId' });
    }

    // mode: subscription (default) or payment (one-time). setup is not supported here.
    const mode = (modeRaw || 'subscription').toString();
    if (!['subscription', 'payment'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Use "subscription" or "payment"' });
    }

    // quantity: optional, default 1
    let quantity = 1;
    if (qtyRaw != null) {
      const q = Number(qtyRaw);
      if (!Number.isInteger(q) || q < 1 || q > 999) {
        return res.status(400).json({ error: 'Invalid quantity (1-999)' });
      }
      quantity = q;
    }

    // Hardcoded base URL for production (as requested)
    const success_url = `${APP_BASE_URL}/index.html?checkout=success`;
    const cancel_url = `${APP_BASE_URL}/index.html?checkout=cancel`;


	    // Extract Supabase user ID from verified JWT for consistent metadata
	    const userId = req.user_id;

    // Optionally create or reuse a Stripe customer by email
    let customerId = null;
    const userEmail = req?.user?.email || req?.auth?.email || null;
    try {
      if (userEmail) {
        // 1) Find customer by email
        const q = new URLSearchParams({ email: userEmail, limit: '1' });
        const listResp = await fetch(`https://api.stripe.com/v1/customers?${q}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (listResp.ok) {
          const listData = await listResp.json().catch(() => null);
          const existing = Array.isArray(listData?.data) ? listData.data[0] : null;
          if (existing) {
            customerId = existing.id;
            // If missing, ensure metadata.user_id and supabase_uid are present on the Customer
            const hasMeta = existing?.metadata && (existing.metadata.user_id || existing.metadata.supabase_uid);
            const hasSupabaseUid = existing?.metadata?.supabase_uid;
            if (!hasMeta || !hasSupabaseUid) {
              try {
                const updateBody = new URLSearchParams();
                updateBody.set('metadata[user_id]', userId);
                updateBody.set('metadata[supabase_uid]', userId);
                await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${stripeKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                  },
                  body: updateBody
                });
              } catch (_) { /* non-blocking */ }
            }
          }
        }
        // 2) If not found, create a new customer with metadata.user_id and optional name
        if (!customerId) {
          const createBody = new URLSearchParams();
          createBody.set('email', userEmail);
          createBody.set('metadata[user_id]', userId);
          createBody.set('metadata[supabase_uid]', userId);
          const userName = req?.user?.user_metadata?.full_name || req?.user?.user_metadata?.name || req?.user?.user_metadata?.display_name || null;
          if (userName) createBody.set('name', userName);
          const createResp = await fetch('https://api.stripe.com/v1/customers', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${stripeKey}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: createBody
          });
          if (createResp.ok) {
            const created = await createResp.json().catch(() => null);
            customerId = created?.id || null;
          }
        }
      }
    } catch (e) {
      console.warn('[/api/checkout] Unable to attach/create customer by email:', e?.message || e);
    }

    // Trace log to confirm we resolved/ensured a Customer with metadata

    // Build form-encoded payload for Stripe API (REST)
    const body = new URLSearchParams();
    body.set('mode', mode);
    body.set('success_url', success_url);
    body.set('cancel_url', cancel_url);
    body.set('line_items[0][price]', priceId);
    body.set('line_items[0][quantity]', String(quantity));
    body.set('metadata[user_id]', userId);
    body.set('metadata[supabase_uid]', userId);
    body.set('client_reference_id', userId);
    body.set('allow_promotion_codes', 'true');

    // CRITICAL: Add metadata to the subscription that will be created
    body.set('subscription_data[metadata][user_id]', userId);
    body.set('subscription_data[metadata][supabase_uid]', userId);

    if (customerId) {
      body.set('customer', customerId);
    }


    // Optional, can be toggled later via env if needed
    // body.set('automatic_tax[enabled]', 'true');

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.url) {
      const msg = data?.error?.message || data?.error || 'Failed to create checkout session';
      console.error('[/api/checkout] Stripe error:', msg, 'status=', resp.status, 'body=', data);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }



    return res.json({ url: data.url });
  } catch (e) {
    console.error('[/api/checkout] Exception:', e?.message || e, e?.stack || '');
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Back-compat route without /api prefix in case of different proxy setups
app.post('/checkout', authenticateUser, async (req, res) => {
  try {

    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/checkout', 'POST', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }

    const { priceId, mode: modeRaw, quantity: qtyRaw } = req.body || {};
    if (!priceId || typeof priceId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid priceId' });
    }

    const mode = (modeRaw || 'subscription').toString();
    if (!['subscription', 'payment'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Use "subscription" or "payment"' });
    }

    let quantity = 1;
    if (qtyRaw != null) {
      const q = Number(qtyRaw);
      if (!Number.isInteger(q) || q < 1 || q > 999) {
        return res.status(400).json({ error: 'Invalid quantity (1-999)' });
      }
      quantity = q;
    }

    const success_url = `${APP_BASE_URL}/index.html?checkout=success`;
    const cancel_url = `${APP_BASE_URL}/index.html?checkout=cancel`;

    const userId = req.user_id;

    // Build form-encoded payload for Stripe API (REST)
    const body = new URLSearchParams();
    body.set('mode', mode);
    body.set('success_url', success_url);
    body.set('cancel_url', cancel_url);
    body.set('line_items[0][price]', priceId);
    body.set('line_items[0][quantity]', String(quantity));
    body.set('metadata[user_id]', userId);
    body.set('metadata[supabase_uid]', userId);
    body.set('client_reference_id', userId);
    body.set('allow_promotion_codes', 'true');

    // CRITICAL: Add metadata to the subscription that will be created
    body.set('subscription_data[metadata][user_id]', userId);
    body.set('subscription_data[metadata][supabase_uid]', userId);


    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.url) {
      const msg = data?.error?.message || data?.error || 'Failed to create checkout session';
      console.error('[/checkout] Stripe error:', msg, 'status=', resp.status, 'body=', data);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    return res.json({ url: data.url });
  } catch (e) {
    console.error('[/checkout] Exception:', e?.message || e, e?.stack || '');
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});


// ---------- Stripe Billing Portal ----------
// Creates a Stripe Billing Portal session so users can manage/cancel their subscription.
// - Auth required; derives user from JWT
// - Returns { url } to redirect the user
app.post('/api/portal', authenticateUser, async (req, res) => {
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/api/portal', 'POST', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }

    const userId = req.user_id;

    // Find the Stripe customer for this user
    let customerId = null;
    if (supabase) {
      try {
        const resp1 = await supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', userId)
          .limit(1);
        let row = null;
        if (!resp1.error && Array.isArray(resp1.data) && resp1.data.length) {
          row = resp1.data[0];
        }
        customerId = row?.stripe_customer_id || null;
      } catch (_) {
        // ignore; we'll still try to proceed
      }
    }

    // Verify customer exists or find/create by email
    const userEmail = req?.user?.email || req?.auth?.email || null;

    // If we have a candidate customerId, verify it exists in current mode (test vs live)
    if (customerId) {
      try {
        const check = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (!check.ok) {
          customerId = null; // invalid/mismatched mode; fall back to email search
        }
      } catch (_) { customerId = null; }
    }

    if (!customerId && userEmail) {
      try {
        const listResp = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(userEmail)}&limit=1`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (listResp.ok) {
          const listJson = await listResp.json().catch(() => null);
          customerId = listJson?.data?.[0]?.id || null;
        }
      } catch (_) { /* ignore */ }
    }

    // If still none, create a customer now (so portal can open even on fresh accounts)
    if (!customerId && userEmail) {
      try {
        const createBody = new URLSearchParams();
        createBody.set('email', userEmail);
        createBody.set('metadata[user_id]', userId);
        const createResp = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: createBody
        });
        if (createResp.ok) {
          const created = await createResp.json().catch(() => null);
          customerId = created?.id || null;
        }
      } catch (_) { /* ignore */ }
    }

    if (!customerId) {
      return res.status(404).json({ error: 'No Stripe customer found for user' });
    }

    // Hardcoded return URL for production (as requested)
    const return_url = `${APP_BASE_URL}/index.html`;

    // Create portal session via Stripe REST API
    const form = new URLSearchParams();
    form.set('customer', customerId);
    form.set('return_url', return_url);

    const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.url) {
      const msg = data?.error?.message || data?.error || 'Failed to create portal session';
      console.error('[/api/portal] Stripe error:', msg, 'status=', resp.status, 'body=', data);
      return res.status(500).json({ error: 'Failed to create portal session' });
    }

    return res.json({ url: data.url });
  } catch (e) {
    console.error('[/api/portal] Exception:', e?.message || e, e?.stack || '');
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// New unified Stripe Billing Portal session endpoint using Stripe SDK
// POST /api/stripe/create-portal-session -> { url }
app.post('/api/stripe/create-portal-session', authenticateUser, async (req, res) => {
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/api/stripe/create-portal-session', 'POST', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    if (!stripe) {
      return res.status(503).json({ error: 'Stripe client not initialized' });
    }

    const userId = req.user_id;
    const stripeKeyConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
    if (!stripeKeyConfigured) {
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }

    // Resolve Stripe customer ID for this user
    let customerId = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', userId)
          .limit(1);
        if (!error && Array.isArray(data) && data.length) {
          customerId = data[0]?.stripe_customer_id || null;
        }
      } catch (_) { /* ignore */ }
    }

    // Verify customer exists in current mode; fall back to email lookup or create
    const userEmail = req?.user?.email || req?.auth?.email || null;
    if (customerId) {
      try {
        const check = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
        });
        if (!check.ok) customerId = null;
      } catch (_) { customerId = null; }
    }
    if (!customerId && userEmail) {
      try {
        const listResp = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(userEmail)}&limit=1`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
        });
        if (listResp.ok) {
          const listJson = await listResp.json().catch(() => null);
          customerId = listJson?.data?.[0]?.id || null;
        }
      } catch (_) { /* ignore */ }
    }
    if (!customerId && userEmail) {
      try {
        const created = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({ email: userEmail, 'metadata[user_id]': userId })
        });
        if (created.ok) {
          const j = await created.json().catch(() => null);
          customerId = j?.id || null;
        }
      } catch (_) { /* ignore */ }
    }

    if (!customerId) {
      return res.status(404).json({ error: 'No Stripe customer found for user' });
    }

    const base = APP_BASE_URL;
    const returnUrl = `${base}/index.html?portal=done`;

    // Create via Stripe SDK
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });


    return res.json({ url: session?.url });
  } catch (e) {
    console.error('[/api/stripe/create-portal-session] Exception:', e?.message || e, e?.stack || '');
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Back-compat when proxies strip /api prefix
app.post('/stripe/create-portal-session', authenticateUser, async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe client not initialized' });
    const userId = req.user_id;

    // Resolve customer id as in the main route
    let customerId = null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', userId)
          .limit(1);
        if (!error && Array.isArray(data) && data.length) {
          customerId = data[0]?.stripe_customer_id || null;
        }
      } catch (_) {}
    }

    const userEmail = req?.user?.email || req?.auth?.email || null;
    if (customerId) {
      try {
        const check = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
        });
        if (!check.ok) customerId = null;
      } catch (_) { customerId = null; }
    }
    if (!customerId && userEmail) {
      try {
        const listResp = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(userEmail)}&limit=1`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}` }
        });
        if (listResp.ok) {
          const listJson = await listResp.json().catch(() => null);
          customerId = listJson?.data?.[0]?.id || null;
        }
      } catch (_) {}
    }
    if (!customerId && userEmail) {
      try {
        const created = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST', headers: { 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ email: userEmail, 'metadata[user_id]': userId })
        });
        if (created.ok) {
          const j = await created.json().catch(() => null);
          customerId = j?.id || null;
        }
      } catch (_) {}
    }

    if (!customerId) return res.status(404).json({ error: 'No Stripe customer found for user' });

    const base = APP_BASE_URL;
    const returnUrl = `${base}/index.html?portal=done`;

    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
    return res.json({ url: session?.url });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});



// Dedicated route to open Billing Portal with subscription_update flow to upgrade/downgrade existing sub
app.post('/api/portal/upgrade', authenticateUser, async (req, res) => {
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/api/portal/upgrade', 'POST', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe not configured on server' });
    }

    const userId = req.user_id;

    // Look up the user's ACTIVE subscription with both customer and subscription IDs
    if (!supabase) return res.status(503).json({ error: 'Database not available' });

    let customerId = null;
    let subscriptionId = null;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id, stripe_subscription_id, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);
      if (!error && Array.isArray(data) && data.length) {
        customerId = data[0]?.stripe_customer_id || null;
        subscriptionId = data[0]?.stripe_subscription_id || null;
      }
    } catch (_) { /* ignore */ }

    if (!customerId) {
      return res.status(400).json({ error: 'no-active-subscription' });
    }

    // Verify customer exists in current mode; recover by email if needed
    try {
      let okCustomer = false;
      // 1) Check current customerId
      try {
        const check = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        okCustomer = check.ok;
      } catch (_) { okCustomer = false; }

      if (!okCustomer) {
        // try to find by email (as in /portal route)
        const userEmail = req?.user?.email || req?.auth?.email || null;
        if (userEmail) {
          try {
            const listResp = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(userEmail)}&limit=1`, {
              method: 'GET', headers: { 'Authorization': `Bearer ${stripeKey}` }
            });
            if (listResp.ok) {
              const listJson = await listResp.json().catch(() => null);
              const found = listJson?.data?.[0]?.id || null;
              if (found) customerId = found;
            }
          } catch (_) {}
        }
      }

      // 2) Verify/resolve subscription id for this customer
      if (subscriptionId) {
        const subCheck = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}` , {
          method: 'GET', headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (subCheck.ok) {
          const js = await subCheck.json().catch(() => null);
          const subCust = js?.customer || null;
          if (!subCust || subCust !== customerId) subscriptionId = null;
        } else {
          subscriptionId = null;
        }
      }

      if (!subscriptionId) {
        const listActive = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=active&limit=1`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (listActive.ok) {
          const j = await listActive.json().catch(() => null);
          const sid = j?.data?.[0]?.id || null;
          if (sid) subscriptionId = sid;
        }
      }
      if (!subscriptionId) {
        const listTrial = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=trialing&limit=1`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (listTrial.ok) {
          const j2 = await listTrial.json().catch(() => null);
          const sid2 = j2?.data?.[0]?.id || null;
          if (sid2) subscriptionId = sid2;
        }
      }
    } catch (_) { /* ignore */ }

    if (!subscriptionId) {
      return res.status(400).json({ error: 'no-active-subscription' });
    }

    // Build portal session with flow_data=subscription_update
    const return_url = `${APP_BASE_URL}/index.html?portal=done`;
    const form = new URLSearchParams();
    form.set('customer', customerId);
    form.set('return_url', return_url);
    form.set('flow_data[type]', 'subscription_update');
    form.set('flow_data[subscription_update][subscription]', subscriptionId);

    // Optional: portal configuration ID via env
    const portalConfigId = process.env.STRIPE_PORTAL_CONFIG_ID;
    if (portalConfigId) {
      form.set('configuration', portalConfigId);
    }

    const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.url) {
      const msg = data?.error?.message || data?.error || 'Failed to create portal session';
      console.error('[/api/portal/upgrade] Stripe error:', msg, 'status=', resp.status, 'body=', data);
      return res.status(500).json({ error: 'Failed to create portal session' });
    }

    return res.json({ url: data.url });
  } catch (e) {
    console.error('[/api/portal/upgrade] Exception:', e?.message || e, e?.stack || '');
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Back-compat when proxies strip /api
app.post('/portal/upgrade', authenticateUser, async (req, res) => {
  // Delegate to the same logic; re-run minimal code to avoid complex router reentry
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(500).json({ error: 'Stripe not configured on server' });

    const userId = req.user_id;
    if (!supabase) return res.status(503).json({ error: 'Database not available' });

    let customerId = null;
    let subscriptionId = null;
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id, stripe_subscription_id, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);
      if (!error && Array.isArray(data) && data.length) {
        customerId = data[0]?.stripe_customer_id || null;
        subscriptionId = data[0]?.stripe_subscription_id || null;
      }
    } catch (_) {}

    if (!customerId) return res.status(400).json({ error: 'no-active-subscription' });

    // Resolve active subscription from Stripe to avoid DB mismatch
    try {
      if (!subscriptionId) {
        const listActive = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=active&limit=1`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (listActive.ok) {
          const j = await listActive.json().catch(() => null);
          const sid = j?.data?.[0]?.id || null;
          if (sid) subscriptionId = sid;
        }
      }
      if (!subscriptionId) {
        const listTrial = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=trialing&limit=1`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (listTrial.ok) {
          const j2 = await listTrial.json().catch(() => null);
          const sid2 = j2?.data?.[0]?.id || null;
          if (sid2) subscriptionId = sid2;
        }
      }
    } catch (_) {}

    if (!subscriptionId) return res.status(400).json({ error: 'no-active-subscription' });

    const return_url = `${APP_BASE_URL}/index.html?portal=done`;
    const form = new URLSearchParams();
    form.set('customer', customerId);
    form.set('return_url', return_url);
    form.set('flow_data[type]', 'subscription_update');
    form.set('flow_data[subscription_update][subscription]', subscriptionId);

    const portalConfigId = process.env.STRIPE_PORTAL_CONFIG_ID;
    if (portalConfigId) form.set('configuration', portalConfigId);

    const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.url) return res.status(500).json({ error: 'Failed to create portal session' });
    return res.json({ url: data.url });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});


// Back-compat route without /api prefix in case of different proxy setups
app.post('/portal', authenticateUser, async (req, res) => {
  // Delegate to the same handler logic by rewriting path
  req.url = '/api/portal';
  // Call the /api/portal handler functionally by invoking fetch to itself could be messy;
  // Instead, repeat minimal logic: find customer, create session, same as above
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(500).json({ error: 'Stripe not configured on server' });

    const userId = req.user_id;
    let customerId = null;
    if (supabase) {
      try {
        const resp1 = await supabase
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', userId)
          .limit(1);
        if (!resp1.error && Array.isArray(resp1.data) && resp1.data.length) {
          customerId = resp1.data[0]?.stripe_customer_id || null;
        }
      } catch (_) {}
    }
    // Verify customer exists or find/create by email
    const userEmail = req?.user?.email || req?.auth?.email || null;

    // If we have a candidate customerId, verify it exists in current mode (test vs live)
    if (customerId) {
      try {
        const check = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (!check.ok) {
          customerId = null; // invalid/mismatched mode; fall back to email search
        }
      } catch (_) { customerId = null; }
    }

    if (!customerId && userEmail) {
      try {
        const listResp = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(userEmail)}&limit=1`, {
          method: 'GET', headers: { 'Authorization': `Bearer ${stripeKey}` }
        });
        if (listResp.ok) {
          const listJson = await listResp.json().catch(() => null);
          customerId = listJson?.data?.[0]?.id || null;
        }
      } catch (_) {}
    }

    // If still none, create a customer now
    if (!customerId && userEmail) {
      try {
        const createBody = new URLSearchParams();
        createBody.set('email', userEmail);
        createBody.set('metadata[user_id]', userId);
        const createResp = await fetch('https://api.stripe.com/v1/customers', {
          method: 'POST', headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: createBody
        });
        if (createResp.ok) {
          const created = await createResp.json().catch(() => null);
          customerId = created?.id || null;
        }
      } catch (_) {}
    }

    if (!customerId) return res.status(404).json({ error: 'No Stripe customer found for user' });

    // Hardcoded return URL for production (as requested)
    const return_url = `${APP_BASE_URL}/index.html`;

    const form = new URLSearchParams();
    form.set('customer', customerId);
    form.set('return_url', return_url);

    const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok || !data?.url) return res.status(500).json({ error: 'Failed to create portal session' });
    return res.json({ url: data.url });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ---------- Stripe Webhook ----------
// Receives subscription lifecycle events. Uses raw body for signature verification.
// Using official Stripe SDK for webhook verification and event retrieval

app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {


  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[/api/stripe-webhook] Missing STRIPE_WEBHOOK_SECRET');
    return res.status(503).send('webhook not configured');
  }
  if (!stripe) {
    console.error('[/api/stripe-webhook] Stripe client not initialized (missing STRIPE_SECRET_KEY)');
    return res.status(503).send('stripe not configured');
  }

  const sig = req.headers['stripe-signature'];
  const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(String(req.body || ''));

  // 1) Verify signature using Stripe SDK
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.warn('[/api/stripe-webhook] constructEvent failed:', err?.message || err);
    return res.status(400).send(`Webhook Error: ${err?.message || 'invalid signature'}`);
  }

  // 2) Retrieve the event from Stripe to ensure authenticity
  let verifiedEvent;
  try {
    verifiedEvent = await stripe.events.retrieve(event.id);
  } catch (err) {
    console.warn('[/api/stripe-webhook] events.retrieve failed:', err?.message || err);
    return res.status(400).send(`Event Retrieval Error: ${err?.message || 'failed to retrieve event'}`);
  }

  // Respond success promptly; handle heavy work async using the verified event
  res.status(200).json({ received: true });

  setImmediate(async () => {
    try {
      // Idempotency check using event ID
      const eventId = verifiedEvent?.id;
      const processedEventsCache = new Set(); // In production, use Redis or database
      if (processedEventsCache.has(eventId)) {
        return;
      }
      processedEventsCache.add(eventId);

      const type = verifiedEvent?.type || '';
      // Handle relevant events with UID prioritization
      if (['checkout.session.completed', 'customer.created', 'customer.updated',
           'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(type)) {
        
        let uid = null;
        let customerId = null;
        let subscriptionId = null;
        let status = null;
        let periodEndUnix = null;
        let priceId = null;

        if (type === 'checkout.session.completed') {
          const session = verifiedEvent?.data?.object || {};

          // Priority 1: metadata.supabase_uid from session
          uid = session?.metadata?.supabase_uid || null;
          // Priority 2: client_reference_id (fallback)
          if (!uid) {
            uid = session?.client_reference_id || null;
          }
          customerId = session?.customer || null;
          subscriptionId = session?.subscription || null;
        } else if (type.startsWith('customer.subscription.')) {
          const obj = verifiedEvent?.data?.object || {};
          subscriptionId = obj?.id || null;
          status = obj?.status || null;
          periodEndUnix = obj?.items?.data?.[0]?.current_period_end || null;
          priceId = obj?.items?.data?.[0]?.price?.id || null;

          console.log('[webhook] Subscription object values:', {
            id: obj?.id,
            status: obj?.status,
            current_period_end_from_item: obj?.items?.data?.[0]?.current_period_end,
            items_count: obj?.items?.data?.length
          });

          // Try to get the real customer id from the subscription payload
          // Stripe delivers either a string "cus_..." or an expanded object
          customerId = (typeof obj.customer === 'string')
            ? obj.customer
            : (obj.customer?.id || null);

          // If it still looks wrong or missing, re-fetch the subscription with expand=customer
          if (!customerId || /^sub_/.test(customerId)) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['customer'] });
              customerId = (typeof sub.customer === 'string') ? sub.customer : (sub.customer?.id || null);
              // Also prefer metadata from the latest authoritative object
              if (!priceId) {
                try { priceId = sub?.items?.data?.[0]?.price?.id || null; } catch (_) {}
              }
              if (!status) status = sub?.status || status || null;
              if (!periodEndUnix) periodEndUnix = sub?.items?.data?.[0]?.current_period_end || periodEndUnix || null;
            } catch (e) {
              console.warn('[webhook] failed to retrieve subscription %s: %s', subscriptionId || 'null', e?.message || e);
            }
          }

          // Resolve UID with clear priority:
          // 1) subscription.metadata.supabase_uid
          // 2) subscription.client_reference_id (rare on subs, but keep for safety)
          // 3) customer.metadata.supabase_uid (or .user_id as fallback)
          uid = obj?.metadata?.supabase_uid || obj?.client_reference_id || null;

          if (!uid && customerId) {
            try {
              const cust = await stripe.customers.retrieve(customerId);
              uid = cust?.metadata?.supabase_uid || cust?.metadata?.user_id || null;
            } catch (e) {
              console.warn('[webhook] failed to fetch customer %s: %s', customerId, e?.message || e);
            }
          }

        }


        // Refuse to process events without UID (security requirement)
        if (!uid) {
          console.warn(`[webhook] SECURITY: Refusing to process ${type} without UID - no supabase_uid in metadata or client_reference_id`);
          return;
        }

        // Upsert customer<->UID mapping (idempotent)
        if (customerId && uid) {
          try {
            const { error: dbError } = await supabase
              .from('subscriptions')
              .upsert({
                user_id: uid,
                stripe_customer_id: customerId
              }, { 
                onConflict: 'user_id',
                ignoreDuplicates: false 
              });
              
            if (dbError) {
              console.warn(`[webhook] Database mapping upsert failed: ${dbError.message}`);
            } else {
            }
          } catch (dbErr) {
            console.warn('[webhook] Database mapping error:', dbErr.message);
          }
        }

        // Handle subscription-specific events
        if (type.startsWith('customer.subscription.') && subscriptionId && status) {
          
          try {
            if (status === 'active' || status === 'trialing') {
              // Create or update subscription record
              const periodEndISO = periodEndUnix ? new Date(Number(periodEndUnix) * 1000).toISOString() : null;
              console.log('[webhook] Upserting subscription:', {
                periodEndUnix,
                periodEndISO,
                status,
                priceId
              });

              const { data, error } = await supabase
                .from('subscriptions')
                .upsert({
                  user_id: uid,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  status: status,
                  current_period_end: periodEndISO,
                  ...(priceId && { price_id: priceId })
                }, {
                  onConflict: 'user_id',
                  ignoreDuplicates: false
                });
                
              if (error) {
                console.error(`[webhook] Subscription upsert failed: ${error.message}`);
              } else {
              }
              } else if (status === 'canceled' || status === 'incomplete_expired') {
                  // Update subscription to canceled/expired
                  const { data, error } = await supabase
                    .from('subscriptions')
                    .update({
                      status,
                      current_period_end: periodEndUnix ? new Date(Number(periodEndUnix) * 1000).toISOString() : null
                    })
                    .eq('user_id', uid);
                
              if (error) {
                console.error(`[webhook] Subscription status update failed: ${error.message}`);
              } else {
              }
            }
          } catch (e) {
            console.error('[webhook] Database operation failed:', e.message);
          }
        }
        
      } else {
      }

    } catch (e) {
      console.error('[/api/stripe-webhook] Handler exception:', e?.message || e);
    }
  });
});

// ---------- Health Check & Validation Endpoints ----------
// Returns customers and subscriptions without supabase_uid metadata
app.get('/admin/unlinked-customers', async (req, res) => {
  try {
    // Extract UID from Authorization header
    const uid = await getUidFromAuthHeader(req.headers.authorization);
    if (!uid) {
      return res.status(401).json({ error: 'Invalid or missing authentication token' });
    }

    // Basic admin check - in production, add proper role verification
    if (!process.env.DEV_BYPASS) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const issues = {
      customers_without_uid: [],
      subscriptions_without_uid: [],
      customers_with_invalid_uid: []
    };

    // Check customers without supabase_uid metadata
    try {
      const customersResp = await fetch('https://api.stripe.com/v1/customers?limit=100', {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      
      if (customersResp.ok) {
        const customersData = await customersResp.json();
        
        for (const customer of customersData.data || []) {
          const supabaseUid = customer?.metadata?.supabase_uid;
          if (!supabaseUid) {
            issues.customers_without_uid.push({
              id: customer.id,
              email: customer.email,
              created: customer.created,
              metadata: customer.metadata || {}
            });
          } else {
            // Validate UID format (should be UUID)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(supabaseUid)) {
              issues.customers_with_invalid_uid.push({
                id: customer.id,
                email: customer.email,
                invalid_uid: supabaseUid
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('[health-check] Customers fetch failed:', e.message);
    }

    // Check active subscriptions without supabase_uid metadata
    try {
      const subscriptionsResp = await fetch('https://api.stripe.com/v1/subscriptions?status=active&limit=100', {
        headers: { 'Authorization': `Bearer ${stripeKey}` }
      });
      
      if (subscriptionsResp.ok) {
        const subscriptionsData = await subscriptionsResp.json();
        
        for (const subscription of subscriptionsData.data || []) {
          const supabaseUid = subscription?.metadata?.supabase_uid;
          if (!supabaseUid) {
            issues.subscriptions_without_uid.push({
              id: subscription.id,
              customer: subscription.customer,
              status: subscription.status,
              metadata: subscription.metadata || {}
            });
          }
        }
      }
    } catch (e) {
      console.error('[health-check] Subscriptions fetch failed:', e.message);
    }

    const summary = {
      customers_without_uid: issues.customers_without_uid.length,
      subscriptions_without_uid: issues.subscriptions_without_uid.length,
      customers_with_invalid_uid: issues.customers_with_invalid_uid.length,
      total_issues: issues.customers_without_uid.length + issues.subscriptions_without_uid.length + issues.customers_with_invalid_uid.length
    };


    return res.json({
      summary,
      issues,
      recommendations: [
        "Use /api/billing/start for new customer creation to ensure UID metadata",
        "Manually update existing customers via Stripe dashboard or API",
        "Monitor webhook logs for UID resolution failures"
      ]
    });

  } catch (error) {
    console.error('[health-check] Exception:', error.message);
    return res.status(500).json({ error: 'Health check failed' });
  }
});

// ---------- Admin Customer Linking ----------
// Manual endpoint to link existing Stripe customers to Supabase users
app.post('/admin/link-customer', authenticateUser, requireAdmin, async (req, res) => {
  if (!stripe || !supabase) {
    return res.status(503).json({ error: 'Stripe or Supabase not configured' });
  }

  const { stripe_customer_id, supabase_user_id } = req.body;
  
  if (!stripe_customer_id || !supabase_user_id) {
    return res.status(400).json({ 
      error: 'Both stripe_customer_id and supabase_user_id are required' 
    });
  }

  try {
    // 1. Verify the Supabase user exists
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(supabase_user_id);
    if (userError || !userData.user) {
      return res.status(404).json({ error: 'Supabase user not found' });
    }

    // 2. Update Stripe customer metadata
    try {
      const customer = await stripe.customers.update(stripe_customer_id, {
        metadata: {
          user_id: supabase_user_id,
          supabase_uid: supabase_user_id
        }
      });
      

      // 3. If there are existing subscriptions, update them in Supabase
      const subscriptions = await stripe.subscriptions.list({
        customer: stripe_customer_id,
        limit: 10
      });

      const updateResults = [];
      for (const sub of subscriptions.data) {
        const periodEndUnix = sub.current_period_end;
        const record = {
          user_id: supabase_user_id,
          stripe_customer_id: stripe_customer_id,
          stripe_subscription_id: sub.id,
          status: sub.status,
          current_period_end: periodEndUnix ? new Date(Number(periodEndUnix) * 1000) : null
        };

        if (sub.items?.data?.[0]?.price?.id) {
          record.price_id = sub.items.data[0].price.id;
        }

        const { data, error } = await supabase
          .from('subscriptions')
          .upsert(record, { onConflict: 'user_id' });

        updateResults.push({ 
          subscription_id: sub.id, 
          status: sub.status, 
          error: error?.message || null,
          success: !error 
        });
      }

      return res.json({ 
        success: true, 
        customer: {
          id: customer.id,
          email: customer.email,
          metadata: customer.metadata
        },
        subscriptions_updated: updateResults,
        message: `Successfully linked Stripe customer ${stripe_customer_id} to Supabase user ${supabase_user_id}`
      });

    } catch (stripeError) {
      console.error('[admin/link-customer] Stripe error:', stripeError.message);
      return res.status(400).json({ error: `Stripe error: ${stripeError.message}` });
    }

  } catch (e) {
    console.error('[admin/link-customer] Exception:', e?.message || e);
    return res.status(500).json({ error: 'Failed to link customer' });
  }
});

// List unlinked Stripe customers (missing supabase_uid metadata)
app.get('/admin/unlinked-customers', authenticateUser, requireAdmin, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  try {
    const customers = await stripe.customers.list({ 
      limit: 100,
      expand: ['data.subscriptions']
    });

    const unlinkedCustomers = customers.data.filter(customer => {
      const hasSupabaseUid = customer.metadata?.supabase_uid;
      const hasUserId = customer.metadata?.user_id;
      return !hasSupabaseUid && !hasUserId; // Completely unlinked
    }).map(customer => ({
      id: customer.id,
      email: customer.email,
      created: new Date(customer.created * 1000).toISOString(),
      subscriptions: customer.subscriptions?.data?.map(sub => ({
        id: sub.id,
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString()
      })) || []
    }));

    return res.json({ 
      unlinked_customers: unlinkedCustomers,
      count: unlinkedCustomers.length 
    });

  } catch (e) {
    console.error('[admin/unlinked-customers] Exception:', e?.message || e);
    return res.status(500).json({ error: 'Failed to list customers' });
  }
});

// Expose recent audit log events (DB if available, else memory)
// Requires admin authentication; payloads are redacted
app.get('/audit-log/recent', authenticateUser, requireAdmin, async (req, res) => {
  if (!supabase) return res.json({ rows: AUDIT_LOG_MEM.map(redactAuditRow) });
  const limitRaw = parseInt(req.query.limit) || 50;
  const limit = Math.min(1000, Math.max(1, limitRaw));
  try {
    const { data, error } = await supabase
      .from('audit_log')
      .select('id, actor_id, route, method, status, reason, payload, at')
      .order('at', { ascending: false })
      .limit(limit);
    if (!error && data) {
      const redacted = data.map(redactAuditRow);
      return res.json({ rows: redacted });
    }
  } catch (_) {
    // ignore and fall back to memory
  }

  // memory fallback
  const rows = AUDIT_LOG_MEM.slice(-limit).reverse();
  const redactedMem = rows.map(redactAuditRow);
  return res.json({ rows: redactedMem });
});

// In-memory fallback for org settings when DB schemas are missing
const ORG_SETTINGS_MEM = new Map(); // key: manager_id, value: { break_policy }

// ---------- auth middleware ----------
async function authenticateUser(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);

  try {
    const claims = await verifySupabaseJWT(token);

    // Ensure we have a valid user ID
    if (!claims.sub) {
      return res.status(401).json({ error: 'Invalid token: missing user ID' });
    }

    console.debug('[auth] using userId:', claims.sub);

    // Attach auth information to request
    req.auth = {
      userId: claims.sub,
      role: claims.role,
      email: claims.email
    };

    // Legacy compatibility - map to existing request properties
    req.user_id = claims.sub;
    req.is_ai_agent = Boolean(claims.ai_agent || claims.app_metadata?.ai_agent || claims.user_metadata?.ai_agent);
    req.user_role = claims.role || claims.app_metadata?.role || claims.user_metadata?.role || null;

    // Create a user object for compatibility with existing code
    req.user = {
      id: claims.sub,
      email: claims.email,
      app_metadata: claims.app_metadata || {},
      user_metadata: claims.user_metadata || {}
    };

    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  try {
    const role = req.user_role || req.user?.app_metadata?.role || req.user?.user_metadata?.role || null;
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin access required' });
    }
    return next();
  } catch (_) {
    return res.status(403).json({ error: 'Forbidden: admin access required' });
  }
}

function redactAuditRow(row) {
  try {
    const safe = { ...row };
    if (Object.prototype.hasOwnProperty.call(safe, 'payload')) {
      // Remove raw payload to avoid leaking PII/secrets
      safe.payload = null;
    }
    return safe;
  } catch (_) {
    return row;
  }
}

// ---------- helpers ----------

// Wage calculation constants and helpers
const PAUSE_THRESHOLD = 5.5;
const PAUSE_DEDUCTION = 0.5;
const PRESET_WAGE_RATES = {
  '-1': 129.91,  // under16
  '-2': 132.90,  // under18
  1: 184.54,
  2: 185.38,
  3: 187.46,
  4: 193.05,
  5: 210.81,
  6: 256.14
};

// Map tariff level to preset wage rate; 0 => null (use custom wage)
function getTariffRate(level) {
  if (level === 0 || level === '0' || level === null || level === undefined) return null;
  return PRESET_WAGE_RATES[level] ?? null;
}

const PRESET_BONUSES = {
  rules: [
    { days: [1, 2, 3, 4, 5], from: '18:00', to: '06:00', rate: 15.5 },
    { days: [6], from: '00:00', to: '24:00', rate: 15.5 },
    { days: [7], from: '00:00', to: '24:00', rate: 31.0 }
  ]
};

function normalizeUb(data) {
  if (!data || typeof data !== 'object') return { data, migrated: false };
  if (Array.isArray(data.rules)) return { data, migrated: false };

  const map = [
    ['weekday', [1, 2, 3, 4, 5]],
    ['saturday', [6]],
    ['sunday', [7]]
  ];

  const rules = [];
  let touched = false;

  for (const [key, days] of map) {
    const arr = Array.isArray(data?.[key]) ? data[key] : [];
    if (!arr.length) continue;
    touched = true;
    for (const x of arr) {
      const rule = { days, from: x.from, to: x.to };
      if (x.percent != null) rule.percent = Number(x.percent);
      else if (x.rate != null) rule.rate = Number(x.rate);
      else continue;
      rules.push(rule);
    }
  }

  if (!touched) return { data, migrated: false };

  const next = { ...data, rules };
  delete next.weekday; delete next.saturday; delete next.sunday;
  return { data: next, migrated: true };
}

const UB_TYPE_TO_DAYS = {
  weekday: [1, 2, 3, 4, 5],
  saturday: [6],
  sunday: [7]
};

const SHIFT_TYPE_TO_DAYS = {
  0: UB_TYPE_TO_DAYS.weekday,
  1: UB_TYPE_TO_DAYS.saturday,
  2: UB_TYPE_TO_DAYS.sunday
};

function ubSegmentsForDays(rules, isoDays) {
  if (!Array.isArray(rules) || !Array.isArray(isoDays) || isoDays.length === 0) return [];
  const daySet = new Set(isoDays);
  return rules
    .filter(rule => Array.isArray(rule?.days) && rule.days.some(day => daySet.has(day)))
    .map(rule => {
      const segment = { from: rule.from, to: rule.to };
      if (rule.percent != null) segment.percent = Number(rule.percent);
      if (rule.rate != null) segment.rate = Number(rule.rate);
      return segment;
    })
    .filter(rule => typeof rule.from === 'string' && typeof rule.to === 'string');
}

function ubSegmentsForShiftType(rules, shiftType) {
  const isoDays = SHIFT_TYPE_TO_DAYS[shiftType] || [];
  return ubSegmentsForDays(rules, isoDays);
}

function ubRuleHourlyValue(rule, baseWageRate) {
  if (!rule) return 0;
  if (rule.rate != null) {
    const rate = Number(rule.rate);
    return Number.isNaN(rate) ? 0 : rate;
  }
  if (rule.percent != null) {
    const pct = Number(rule.percent);
    if (Number.isNaN(pct)) return 0;
    return baseWageRate * (pct / 100);
  }
  return 0;
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// ---------- Organization settings helpers ----------
const BREAK_POLICY_ALLOWED = new Set([
  'fixed_0_5_over_5_5h',
  'none',
  'proportional_across_periods',
  'from_base_rate'
]);

function isRelationMissing(error) {
  const code = error?.code || error?.details || '';
  const msg = (error?.message || '').toLowerCase();
  return code === '42P01' || (msg.includes('relation') && msg.includes('does not exist'));
}

function isColumnMissing(error) {
  const code = error?.code || error?.details || '';
  const msg = (error?.message || '').toLowerCase();
  return code === '42703' || (msg.includes('column') && msg.includes('does not exist'));
}

async function getOrgSettings(managerId) {
  // Prefer dedicated table organization_settings if exists
  try {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('break_policy')
      .eq('manager_id', managerId)
      .single();
    if (!error && data) {
      const policy = BREAK_POLICY_ALLOWED.has(data.break_policy) ? data.break_policy : 'proportional_across_periods';
      return { break_policy: policy };
    }
    if (error && !isRelationMissing(error)) {
      // Table exists but other error (or no row)
      if (error.code === 'PGRST116') {
        // No row; fall through to next storage or memory default
      } else {
        console.warn('[org-settings] organization_settings error:', error);
      }
    }
  } catch (e) {
    // ignore, try user_settings
  }

  // Fallback: read from user_settings if column exists
  try {
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', managerId)
      .single();
    if (!error && settings) {
      const policy = settings.break_policy && BREAK_POLICY_ALLOWED.has(settings.break_policy)
        ? settings.break_policy
        : 'proportional_across_periods';
      return { break_policy: policy };
    }
    if (error) {
      if (!isRelationMissing(error) && !isColumnMissing(error) && error.code !== 'PGRST116') {
        console.warn('[org-settings] user_settings error:', error);
      }
    }
  } catch (e) {
    // ignore
  }

  // Memory fallback
  const mem = ORG_SETTINGS_MEM.get(managerId) || { break_policy: 'fixed_0_5_over_5_5h' };
  return mem;
}

async function setOrgSettings(managerId, break_policy) {
  const finalPolicy = BREAK_POLICY_ALLOWED.has(break_policy) ? break_policy : 'proportional_across_periods';

  // Try dedicated table first
  try {
    // Upsert organization_settings
    const { data, error } = await supabase
      .from('organization_settings')
      .upsert({ manager_id: managerId, break_policy: finalPolicy, updated_at: new Date().toISOString() }, { onConflict: 'manager_id' })
      .select('break_policy')
      .single();
    if (!error && data) return { break_policy: data.break_policy };
    if (error && !isRelationMissing(error)) {
      console.warn('[org-settings] upsert organization_settings error:', error);
    }
  } catch (e) {
    // ignore
  }

  // Fallback: user_settings if column present
  try {
    // Ensure a row exists
    const { data: existing, error: fetchErr } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', managerId)
      .single();
    if (fetchErr && fetchErr.code !== 'PGRST116' && !isRelationMissing(fetchErr)) {
      console.warn('[org-settings] fetch user_settings error:', fetchErr);
    }
    if (!existing) {
      // Insert new row with possible break_policy if column exists
      const insertObj = { user_id: managerId, updated_at: new Date().toISOString(), break_policy: finalPolicy };
      const { data: inserted, error: insertErr } = await supabase
        .from('user_settings')
        .insert(insertObj)
        .select('*')
        .single();
      if (!insertErr && inserted && 'break_policy' in inserted) {
        return { break_policy: inserted.break_policy };
      }
      if (insertErr) {
        if (!isColumnMissing(insertErr) && !isRelationMissing(insertErr)) {
          console.warn('[org-settings] insert user_settings error:', insertErr);
        }
      }
    } else {
      // Update existing
      const { data: updated, error: updateErr } = await supabase
        .from('user_settings')
        .update({ break_policy: finalPolicy, updated_at: new Date().toISOString() })
        .eq('user_id', managerId)
        .select('*')
        .single();
      if (!updateErr && updated && 'break_policy' in updated) {
        return { break_policy: updated.break_policy };
      }
      if (updateErr) {
        if (!isColumnMissing(updateErr) && !isRelationMissing(updateErr)) {
          console.warn('[org-settings] update user_settings error:', updateErr);
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Memory fallback as last resort
  ORG_SETTINGS_MEM.set(managerId, { break_policy: finalPolicy });
  return { break_policy: finalPolicy };
}

// ---------- /org-settings ----------
app.get('/org-settings', authenticateUser, async (req, res) => {
  try {
    const managerId = req.user_id;
    const settings = await getOrgSettings(managerId);
    return res.json({ break_policy: settings.break_policy });
  } catch (e) {
    console.error('GET /org-settings error:', e);
    return res.status(500).json({ error: 'Failed to fetch organization settings' });
  }
});

app.put('/org-settings', authenticateUser, async (req, res) => {
  try {
    if (isAiAgent(req)) return res.status(403).json({ error: 'Agent writes are not allowed' });
    const managerId = req.user_id;
    const { break_policy } = req.body || {};
    if (!BREAK_POLICY_ALLOWED.has(break_policy)) {
      return res.status(400).json({ error: 'Invalid break_policy' });
    }
    const updated = await setOrgSettings(managerId, break_policy);
    return res.json({ break_policy: updated.break_policy });
  } catch (e) {
    console.error('PUT /org-settings error:', e);
    return res.status(500).json({ error: 'Failed to update organization settings' });
  }
});

function minutesToTime(minutes) {
  // Convert minutes back to time string, handling values >= 24 hours
  const adjustedMinutes = minutes % (24 * 60);
  const hours = Math.floor(adjustedMinutes / 60);
  const mins = adjustedMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function calculateOverlap(start1, end1, start2, end2) {
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  return Math.max(0, overlapEnd - overlapStart);
}

function calculateBonus(startTime, endTime, bonusSegments, baseWageRate = 0) {
  let totalBonus = 0;
  const startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  // Handle shifts that continue past midnight
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  for (const segment of bonusSegments) {
    const segStart = timeToMinutes(segment.from);
    let segEnd = timeToMinutes(segment.to);
    if (segEnd <= segStart) {
      segEnd += 24 * 60;
    }
    const overlap = calculateOverlap(startMinutes, endMinutes, segStart, segEnd);
    totalBonus += (overlap / 60) * ubRuleHourlyValue(segment, baseWageRate);
  }
  return totalBonus;
}

// Legal break deduction calculation system
function calculateLegalBreakDeduction(shift, userSettings, wageRate, bonuses) {
  const startMinutes = timeToMinutes(shift.start_time);
  let endMinutes = timeToMinutes(shift.end_time);

  // Handle shifts that cross midnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  } else if (endMinutes === startMinutes) {
    endMinutes += 24 * 60;
  }

  const totalDurationHours = (endMinutes - startMinutes) / 60;

  // Get break deduction settings with defaults
  const breakSettings = {
    enabled: userSettings?.pause_deduction_enabled !== false,
    method: userSettings?.pause_deduction_method || 'proportional',
    thresholdHours: userSettings?.pause_threshold_hours || 5.5,
    deductionMinutes: userSettings?.pause_deduction_minutes || 30,
    auditEnabled: userSettings?.audit_break_calculations !== false
  };

  // Check if break deduction should be applied
  if (!breakSettings.enabled || totalDurationHours <= breakSettings.thresholdHours) {
    return {
      shouldDeduct: false,
      deductionHours: 0,
      adjustedEndMinutes: endMinutes,
      auditTrail: breakSettings.auditEnabled ? {
        originalDuration: totalDurationHours,
        thresholdHours: breakSettings.thresholdHours,
        method: breakSettings.method,
        reason: !breakSettings.enabled ? 'Break deduction disabled' : 'Shift duration below threshold',
        wagePeriods: [],
        deductedHours: 0,
        complianceNotes: []
      } : null
    };
  }

  const deductionHours = breakSettings.deductionMinutes / 60;

  // Calculate wage periods for audit trail and method-specific deduction
  const wagePeriods = calculateWagePeriods(shift, wageRate, bonuses, startMinutes, endMinutes);

  // Apply break deduction based on selected method
  let adjustedEndMinutes = endMinutes;
  let methodSpecificDeduction = null;

  switch (breakSettings.method) {
    case 'none':
      // No deduction - paid pause
      methodSpecificDeduction = {
        deductionHours: 0,
        adjustedEndMinutes: endMinutes,
        deductionDetails: 'No break deduction applied - paid pause'
      };
      break;

    case 'proportional':
      // Deduct proportionally across all wage periods
      methodSpecificDeduction = applyProportionalDeduction(wagePeriods, deductionHours, startMinutes, endMinutes);
      break;

    case 'base_only':
      // Deduct only from base rate periods
      methodSpecificDeduction = applyBaseOnlyDeduction(wagePeriods, deductionHours, startMinutes, endMinutes);
      break;

    case 'end_of_shift':
    default:
      // Legacy method - deduct from end of shift
      methodSpecificDeduction = {
        deductionHours: deductionHours,
        adjustedEndMinutes: endMinutes - breakSettings.deductionMinutes,
        deductionDetails: 'Break deducted from end of shift (legacy method)'
      };
      break;
  }

  let auditTrail = null;
  if (breakSettings.auditEnabled) {
    auditTrail = {
      originalDuration: totalDurationHours,
      thresholdHours: breakSettings.thresholdHours,
      method: breakSettings.method,
      deductionMinutes: breakSettings.deductionMinutes,
      wagePeriods: wagePeriods,
      deductedHours: methodSpecificDeduction.deductionHours,
      deductionDetails: methodSpecificDeduction.deductionDetails,
      complianceNotes: []
    };

    // Add compliance warnings for problematic methods
    if (breakSettings.method === 'end_of_shift') {
      auditTrail.complianceNotes.push('WARNING: End-of-shift deduction may not comply with labor laws in all jurisdictions');
    }
  }

  return {
    shouldDeduct: breakSettings.method !== 'none',
    deductionHours: methodSpecificDeduction.deductionHours,
    adjustedEndMinutes: methodSpecificDeduction.adjustedEndMinutes,
    method: breakSettings.method,
    auditTrail: auditTrail
  };
}

// Calculate wage periods for break deduction analysis (non-overlapping periods)
function calculateWagePeriods(shift, baseWageRate, bonuses, startMinutes, endMinutes) {
  const periods = [];
  const rules = Array.isArray(bonuses?.rules) ? bonuses.rules : [];
  const shiftDate = shift?.shift_date ? new Date(shift.shift_date) : null;
  const startDow = shiftDate ? shiftDate.getDay() : (shift?.shift_type === 2 ? 0 : (shift?.shift_type === 1 ? 6 : 1));
  const dayToIso = (dow) => (dow === 0 ? 7 : dow);

  const buildDay = (dayStart, dayEnd, isoDay) => {
    if (dayEnd <= dayStart) return;
    const applicable = ubSegmentsForDays(rules, [isoDay]);
    let segments = [{ start: dayStart, end: dayEnd, bonuses: [] }];
    for (const bonus of applicable) {
      const bonusStart = timeToMinutes(bonus.from);
      const rawEnd = timeToMinutes(bonus.to);
      if (!Number.isFinite(bonusStart) || !Number.isFinite(rawEnd)) continue;

      const intervals = rawEnd <= bonusStart
        ? [
            [bonusStart, rawEnd + 24 * 60],
            [bonusStart - 24 * 60, rawEnd]
          ]
        : [[bonusStart, rawEnd]];

      for (const [intervalStart, intervalEnd] of intervals) {
        if (intervalEnd <= intervalStart) continue;
        const overlapStart = Math.max(dayStart, intervalStart);
        const overlapEnd = Math.min(dayEnd, intervalEnd);

        if (overlapEnd > overlapStart) {
          const newSegments = [];
          for (const segment of segments) {
            if (segment.end <= overlapStart || segment.start >= overlapEnd) {
              newSegments.push(segment);
            } else {
              if (segment.start < overlapStart) {
                newSegments.push({ start: segment.start, end: overlapStart, bonuses: [...segment.bonuses] });
              }
              const overlapSegmentStart = Math.max(segment.start, overlapStart);
              const overlapSegmentEnd = Math.min(segment.end, overlapEnd);
              if (overlapSegmentEnd > overlapSegmentStart) {
                newSegments.push({
                  start: overlapSegmentStart,
                  end: overlapSegmentEnd,
                  bonuses: [...segment.bonuses, bonus]
                });
              }
              if (segment.end > overlapEnd) {
                newSegments.push({ start: overlapEnd, end: segment.end, bonuses: [...segment.bonuses] });
              }
            }
          }
          segments = newSegments;
        }
      }
    }

    for (const segment of segments) {
      const durationMinutes = segment.end - segment.start;
      if (durationMinutes <= 0) continue;
      const durationHours = durationMinutes / 60;
      const bonusRate = segment.bonuses.reduce((sum, slot) => sum + ubRuleHourlyValue(slot, baseWageRate), 0);
      periods.push({
        startMinutes: segment.start,
        endMinutes: segment.end,
        durationHours,
        wageRate: baseWageRate,
        bonusRate,
        totalRate: baseWageRate + bonusRate,
        type: bonusRate > 0 ? 'bonus' : 'base',
        bonuses: segment.bonuses.map(slot => ({ ...slot }))
      });
    }
  };

  const firstEnd = Math.min(endMinutes, 24 * 60);
  buildDay(startMinutes, firstEnd, dayToIso(startDow));

  if (endMinutes > 24 * 60) {
    const nextDow = (startDow + 1) % 7;
    buildDay(0, endMinutes - 24 * 60, dayToIso(nextDow));
  }

  return periods;
}


// Apply proportional break deduction across all wage periods
function applyProportionalDeduction(wagePeriods, deductionHours, startMinutes, endMinutes) {
  const totalShiftHours = (endMinutes - startMinutes) / 60;
  let remainingDeduction = deductionHours;
  let totalDeducted = 0;

  // Calculate proportional deduction for each period
  const deductionDetails = [];

  for (const period of wagePeriods) {
    if (remainingDeduction <= 0) break;

    const periodProportion = period.durationHours / totalShiftHours;
    const periodDeduction = Math.min(deductionHours * periodProportion, remainingDeduction);

    if (periodDeduction > 0) {
      totalDeducted += periodDeduction;
      remainingDeduction -= periodDeduction;
      deductionDetails.push(`${periodDeduction.toFixed(2)}h from ${period.type} rate (${period.totalRate} kr/h)`);
    }
  }

  return {
    deductionHours: totalDeducted,
    adjustedEndMinutes: endMinutes - (totalDeducted * 60),
    deductionDetails: `Proportional deduction: ${deductionDetails.join(', ')}`
  };
}

// Apply break deduction only to base rate periods
function applyBaseOnlyDeduction(wagePeriods, deductionHours, startMinutes, endMinutes) {
  let remainingDeduction = deductionHours;
  let totalDeducted = 0;

  // Find base rate periods (lowest bonus rate)
  const basePeriods = wagePeriods.filter(p => p.bonusRate === 0);
  const deductionDetails = [];

  if (basePeriods.length === 0) {
    // No base periods, deduct from periods with smallest bonuses
    const sortedPeriods = [...wagePeriods].sort((a, b) => a.bonusRate - b.bonusRate);
    const smallestBonus = sortedPeriods[0].bonusRate;
    const targetPeriods = sortedPeriods.filter(p => p.bonusRate === smallestBonus);

    for (const period of targetPeriods) {
      if (remainingDeduction <= 0) break;

      const periodDeduction = Math.min(period.durationHours, remainingDeduction);
      totalDeducted += periodDeduction;
      remainingDeduction -= periodDeduction;
      deductionDetails.push(`${periodDeduction.toFixed(2)}h from lowest bonus rate (${period.totalRate} kr/h)`);
    }
  } else {
    // Deduct from base rate periods
    for (const period of basePeriods) {
      if (remainingDeduction <= 0) break;

      const periodDeduction = Math.min(period.durationHours, remainingDeduction);
      totalDeducted += periodDeduction;
      remainingDeduction -= periodDeduction;
      deductionDetails.push(`${periodDeduction.toFixed(2)}h from base rate (${period.wageRate} kr/h)`);
    }
  }

  return {
    deductionHours: totalDeducted,
    adjustedEndMinutes: endMinutes - (totalDeducted * 60),
    deductionDetails: `Base-only deduction: ${deductionDetails.join(', ')}`
  };
}

// Calculate adjusted wages based on break deduction method
function calculateAdjustedWages(breakResult, baseWageRate) {
  let totalBaseWage = 0;
  let totalBonus = 0;
  let totalHours = 0;

  if (!breakResult.auditTrail || !breakResult.auditTrail.wagePeriods) {
    return { baseWage: 0, bonus: 0, totalHours: 0 };
  }

  const wagePeriods = breakResult.auditTrail.wagePeriods;
  const method = breakResult.method;
  const deductionHours = breakResult.deductionHours;

  if (method === 'proportional') {
    // Apply proportional deduction to each period
    const totalShiftHours = wagePeriods.reduce((sum, period) => sum + period.durationHours, 0);

    for (const period of wagePeriods) {
      const periodProportion = period.durationHours / totalShiftHours;
      const periodDeduction = deductionHours * periodProportion;
      const adjustedPeriodHours = Math.max(0, period.durationHours - periodDeduction);

      totalHours += adjustedPeriodHours;
      totalBaseWage += adjustedPeriodHours * period.wageRate;
      totalBonus += adjustedPeriodHours * period.bonusRate;
    }
  } else if (method === 'base_only') {
    // Apply deduction only to base rate periods
    let remainingDeduction = deductionHours;

    // First pass: deduct from base periods
    const basePeriods = wagePeriods.filter(p => p.bonusRate === 0);
    const bonusPeriods = wagePeriods.filter(p => p.bonusRate > 0);

    for (const period of basePeriods) {
      const periodDeduction = Math.min(period.durationHours, remainingDeduction);
      const adjustedPeriodHours = period.durationHours - periodDeduction;
      remainingDeduction -= periodDeduction;

      totalHours += adjustedPeriodHours;
      totalBaseWage += adjustedPeriodHours * period.wageRate;
    }

    // Add all bonus periods (no deduction from bonus periods in base_only method)
    for (const period of bonusPeriods) {
      totalHours += period.durationHours;
      totalBaseWage += period.durationHours * period.wageRate;
      totalBonus += period.durationHours * period.bonusRate;
    }
  }

  return {
    baseWage: parseFloat(totalBaseWage.toFixed(2)),
    bonus: parseFloat(totalBonus.toFixed(2)),
    totalHours: parseFloat(totalHours.toFixed(2))
  };
}

async function getUserSettings(user_id) {
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user_id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user settings:', error);
    return null;
  }

  if (settings && 'custom_bonuses' in settings) {
    const normalized = normalizeUb(settings.custom_bonuses);
    if (normalized.migrated) {
      try {
        const column = settings?.id ? 'id' : 'user_id';
        const value = settings?.id ?? user_id;
        if (value) {
          await supabase
            .from('user_settings')
            .update({ custom_bonuses: normalized.data })
            .eq(column, value);
          console.info('UB migrated ->', value);
        }
      } catch (migrationError) {
        console.warn('Failed to persist migrated UB bonuses', migrationError);
      }
    }
    settings.custom_bonuses = normalized.data && typeof normalized.data === 'object'
      ? {
          ...normalized.data,
          rules: Array.isArray(normalized.data.rules) ? normalized.data.rules : []
        }
      : { rules: [] };
  }

  return settings;
}

// Date resolution functions for temporal references
function resolveDateReference(reference, viewingMonth, viewingYear) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Normalize reference to lowercase
  const ref = reference.toLowerCase().trim();

  // Handle month references
  if (ref.includes('denne måneden') || ref.includes('inneværende måned') || ref === 'denne måned') {
    const firstDay = new Date(viewingYear, viewingMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(viewingYear, viewingMonth, 0).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${getMonthName(viewingMonth)} ${viewingYear}` };
  }

  if (ref.includes('forrige måned') || ref.includes('sist måned')) {
    let prevMonth = viewingMonth - 1;
    let prevYear = viewingYear;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear = viewingYear - 1;
    }
    const firstDay = new Date(prevYear, prevMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(prevYear, prevMonth, 0).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${getMonthName(prevMonth)} ${prevYear}` };
  }

  if (ref.includes('neste måned')) {
    let nextMonth = viewingMonth + 1;
    let nextYear = viewingYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = viewingYear + 1;
    }
    const firstDay = new Date(nextYear, nextMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(nextYear, nextMonth, 0).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${getMonthName(nextMonth)} ${nextYear}` };
  }

  // Handle week references
  if (ref.includes('denne uka') || ref.includes('denne uken') || ref === 'denne uke') {
    const { start, end } = getCurrentWeekDateRange();
    return { from_date: start, to_date: end, description: 'denne uka' };
  }

  if (ref.includes('forrige uke') || ref.includes('sist uke')) {
    const { start, end } = getPreviousWeekDateRange();
    return { from_date: start, to_date: end, description: 'forrige uke' };
  }

  if (ref.includes('neste uke')) {
    const { start, end } = getNextWeeksDateRange(1);
    return { from_date: start, to_date: end, description: 'neste uke' };
  }

  // Handle quarter references
  if (ref.includes('dette kvartalet') || ref.includes('inneværende kvartal')) {
    const quarter = Math.ceil(viewingMonth / 3);
    const firstMonth = (quarter - 1) * 3 + 1;
    const lastMonth = quarter * 3;
    const firstDay = new Date(viewingYear, firstMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(viewingYear, lastMonth, 0).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `Q${quarter} ${viewingYear}` };
  }

  // Handle year references
  if (ref.includes('i år') || ref.includes('dette året')) {
    const firstDay = new Date(viewingYear, 0, 1).toISOString().slice(0, 10);
    const lastDay = new Date(viewingYear, 11, 31).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${viewingYear}` };
  }

  if (ref.includes('i fjor') || ref.includes('forrige år')) {
    const prevYear = viewingYear - 1;
    const firstDay = new Date(prevYear, 0, 1).toISOString().slice(0, 10);
    const lastDay = new Date(prevYear, 11, 31).toISOString().slice(0, 10);
    return { from_date: firstDay, to_date: lastDay, description: `${prevYear}` };
  }

  // Return null if no pattern matches
  return null;
}

function getMonthName(monthNumber) {
  const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  return monthNames[monthNumber - 1];
}

function getPreviousWeekDateRange() {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? 6 : currentDay - 1; // Sunday = 0, so 6 days back to Monday

  // Get last week's Monday
  const lastWeekMonday = new Date(today);
  lastWeekMonday.setDate(today.getDate() - mondayOffset - 7);

  // Get last week's Sunday
  const lastWeekSunday = new Date(lastWeekMonday);
  lastWeekSunday.setDate(lastWeekMonday.getDate() + 6);

  return {
    start: lastWeekMonday.toISOString().slice(0, 10),
    end: lastWeekSunday.toISOString().slice(0, 10)
  };
}

function calculateShiftEarnings(shift, userSettings) {
  const startMinutes = timeToMinutes(shift.start_time);
  let endMinutes = timeToMinutes(shift.end_time);

  // Handle shifts that cross midnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  } else if (endMinutes === startMinutes) {
    // Assume 24-hour shift if times are identical
    endMinutes += 24 * 60;
  }

  const durationHours = (endMinutes - startMinutes) / 60;

  if (durationHours <= 0) {
    return {
      hours: 0,
      totalHours: 0,
      paidHours: 0,
      pauseDeducted: false,
      baseWage: 0,
      bonus: 0,
      total: 0,
      breakDeduction: null
    };
  }

  // Get wage rate
  const usePreset = userSettings?.use_preset !== false;
  const wageRate = usePreset
    ? PRESET_WAGE_RATES[userSettings?.wage_level || userSettings?.current_wage_level || 1]
    : (userSettings?.custom_wage || 200);

  // Get bonuses
  const bonuses = usePreset ? PRESET_BONUSES : (userSettings?.custom_bonuses || { rules: [] });

  // Apply legal break deduction system
  const breakResult = calculateLegalBreakDeduction(shift, userSettings, wageRate, bonuses);

  let paidHours = durationHours;
  let adjustedEndMinutes = endMinutes;

  let baseWage = 0;
  let bonus = 0;

  if (breakResult.shouldDeduct && (breakResult.method === 'proportional' || breakResult.method === 'base_only')) {
    // For proportional and base_only methods, calculate wages based on adjusted wage periods
    const adjustedWages = calculateAdjustedWages(breakResult, wageRate);
    baseWage = adjustedWages.baseWage;
    bonus = adjustedWages.bonus;
    paidHours = adjustedWages.totalHours;

    // Debug logging removed
  } else {
    // For end_of_shift and none methods, use traditional calculation
    if (breakResult.shouldDeduct) {
      paidHours -= breakResult.deductionHours;
      adjustedEndMinutes = breakResult.adjustedEndMinutes;
    }

    baseWage = paidHours * wageRate;

    const periods = calculateWagePeriods(shift, wageRate, bonuses, startMinutes, adjustedEndMinutes);
    bonus = periods.reduce((sum, period) => sum + period.durationHours * period.bonusRate, 0);

    // Debug logging for traditional calculations
    if (durationHours > 5.5) {
      // Additional processing for longer shifts if needed
    }
  }

  return {
    hours: parseFloat(paidHours.toFixed(2)),
    totalHours: parseFloat(durationHours.toFixed(2)),
    paidHours: parseFloat(paidHours.toFixed(2)),
    pauseDeducted: breakResult.shouldDeduct,
    baseWage: parseFloat(baseWage.toFixed(2)),
    bonus: parseFloat(bonus.toFixed(2)),
    total: parseFloat((baseWage + bonus).toFixed(2)),
    breakDeduction: breakResult.auditTrail
  };
}

function generateSeriesDates(from, to, days, intervalWeeks = 1, offsetStart = 0) {
  const start = new Date(`${from}T00:00:00Z`);
  const end   = new Date(`${to}T00:00:00Z`);
  const out   = [];

  // Calculate the reference week (week 0) based on start date and offset
  const referenceDate = new Date(start);
  referenceDate.setUTCDate(referenceDate.getUTCDate() + (offsetStart * 7));

  // Get the Monday of the reference week
  const referenceMonday = new Date(referenceDate);
  const dayOfWeek = referenceDate.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so 6 days back to Monday
  referenceMonday.setUTCDate(referenceDate.getUTCDate() - daysToMonday);

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (days.includes(d.getUTCDay())) {
      // Calculate which week this date is in relative to reference Monday
      const daysDiff = Math.floor((d.getTime() - referenceMonday.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.floor(daysDiff / 7);

      // Only include if this week matches the interval pattern
      if (weekNumber >= 0 && weekNumber % intervalWeeks === 0) {
        out.push(new Date(d));
      }
    }
  }
  return out;
}

function hoursBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
}

function getWeekDateRange(weekNumber, year) {
  // Get first day of year
  const firstDay = new Date(year, 0, 1);

  // Find first Monday of the year (ISO week starts on Monday)
  const firstMonday = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  firstMonday.setDate(firstDay.getDate() + daysToMonday);

  // Calculate start of target week
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  // Calculate end of target week (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    start: weekStart.toISOString().slice(0, 10),
    end: weekEnd.toISOString().slice(0, 10)
  };
}

function getCurrentWeekDateRange() {
  const today = new Date();
  const currentDay = today.getDay();

  // Find start of current week (Monday)
  const startOfCurrentWeek = new Date(today);
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  startOfCurrentWeek.setDate(today.getDate() + daysToMonday);

  // End of current week (Sunday)
  const endOfCurrentWeek = new Date(startOfCurrentWeek);
  endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);

  return {
    start: startOfCurrentWeek.toISOString().slice(0, 10),
    end: endOfCurrentWeek.toISOString().slice(0, 10)
  };
}

function getNextWeeksDateRange(numWeeks = 1) {
  const today = new Date();
  const currentDay = today.getDay();

  // Find start of current week (Monday)
  const startOfCurrentWeek = new Date(today);
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  startOfCurrentWeek.setDate(today.getDate() + daysToMonday);

  // Start of next week
  const startOfNextWeek = new Date(startOfCurrentWeek);
  startOfNextWeek.setDate(startOfCurrentWeek.getDate() + 7);

  // End of the period (end of the last requested week)
  const endOfPeriod = new Date(startOfNextWeek);
  endOfPeriod.setDate(startOfNextWeek.getDate() + (numWeeks * 7) - 1);

  return {
    start: startOfNextWeek.toISOString().slice(0, 10),
    end: endOfPeriod.toISOString().slice(0, 10)
  };
}

// Parse natural language date references
function parseNaturalDate(dateReference) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dayNames = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
  const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const ref = dateReference.toLowerCase().trim();

  // Handle specific cases
  if (ref === 'today' || ref === 'i dag' || ref === 'idag') {
    return today.toISOString().slice(0, 10);
  }

  if (ref === 'tomorrow' || ref === 'i morgen' || ref === 'imorgen') {
    return tomorrow.toISOString().slice(0, 10);
  }

  // Handle weekday names (Norwegian and English)
  const allDayNames = [...dayNames, ...dayNamesEn];
  for (let i = 0; i < allDayNames.length; i++) {
    const dayName = allDayNames[i];
    if (ref === dayName || ref === `neste ${dayName}` || ref === `next ${dayName}`) {
      const targetDay = i % 7; // Get day index (0 = Sunday, 1 = Monday, etc.)
      const currentDay = today.getDay();

      let daysToAdd;
      if (ref.includes('neste') || ref.includes('next')) {
        // Next occurrence of this weekday (at least 7 days from now)
        daysToAdd = 7 + ((targetDay - currentDay + 7) % 7);
      } else {
        // Next occurrence of this weekday (could be today if it matches)
        daysToAdd = (targetDay - currentDay + 7) % 7;
        if (daysToAdd === 0 && targetDay !== currentDay) {
          daysToAdd = 7; // If it's the same day, go to next week
        }
      }

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      return targetDate.toISOString().slice(0, 10);
    }
  }

  // If no match found, return null
  return null;
}

// Validate employee_id belongs to authenticated manager
async function validateEmployeeOwnership(managerId, employeeId) {
  if (!employeeId) {
    return { valid: true }; // No employee_id provided is valid (optional)
  }

  try {
    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, name, display_color')
      .eq('id', employeeId)
      .eq('manager_id', managerId)
      .is('archived_at', null) // Only active employees
      .single();

    if (error || !employee) {
      return {
        valid: false,
        error: 'Employee not found or does not belong to you',
        statusCode: 403
      };
    }

    return {
      valid: true,
      employee: {
        id: employee.id,
        name: employee.name,
        display_color: employee.display_color
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to validate employee ownership',
      statusCode: 500
    };
  }
}

// Validate if user can create shift based on subscription and paywall rules
async function validateShiftCreation(userId, shiftDate) {
  try {
    // Get current subscription status and before_paywall flag
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('before_paywall')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('[paywall] Could not fetch profile:', profileError);
    }

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status, price_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError && subError.code !== 'PGRST116') {
      console.warn('[paywall] Could not fetch subscription:', subError);
      // If subscriptions table is not accessible, default to free tier rules
      console.warn('[paywall] Defaulting to free tier validation due to subscription query error');
    }

    const isActiveSubscription = subscription?.status === 'active';
    const beforePaywall = userProfile?.before_paywall === true;

    // Rule 1: Active subscription = full access
    if (isActiveSubscription) {
      return { valid: true };
    }

    // Rule 2: No active subscription but before_paywall = true = grandfathered access
    if (beforePaywall) {
      return { valid: true };
    }

    // Rule 3: Check if user has shifts outside current month (free tier limitation)
    const targetMonth = shiftDate.substring(0, 7); // YYYY-MM format

    // Get all distinct months where user has shifts
    const { data: existingShifts, error } = await supabase
      .from('user_shifts')
      .select('shift_date')
      .eq('user_id', userId);

    if (error) {
      console.warn('[paywall] Could not fetch existing shifts:', error);
      return { valid: false, error: 'System error', requiresUpgrade: false };
    }

    if (!existingShifts || existingShifts.length === 0) {
      // No existing shifts = can create
      return { valid: true };
    }

    // Extract unique months from existing shifts
    const existingMonths = new Set(
      existingShifts.map(shift => shift.shift_date.substring(0, 7))
    );

    // If user only has shifts in target month, allow creation
    if (existingMonths.size === 1 && existingMonths.has(targetMonth)) {
      return { valid: true };
    }

    // If user has no shifts in target month, but has shifts in other months, block
    if (!existingMonths.has(targetMonth) && existingMonths.size > 0) {
      return {
        valid: false,
        error: 'premium_feature_required',
        requiresUpgrade: true,
        otherMonths: Array.from(existingMonths).filter(month => month !== targetMonth)
      };
    }

    // If user has shifts in target month AND other months, block
    if (existingMonths.has(targetMonth) && existingMonths.size > 1) {
      return {
        valid: false,
        error: 'premium_feature_required',
        requiresUpgrade: true,
        otherMonths: Array.from(existingMonths).filter(month => month !== targetMonth)
      };
    }

    // Default allow (shouldn't reach here)
    return { valid: true };

  } catch (error) {
    console.error('[paywall] Validation error:', error);
    return { valid: false, error: 'System error', requiresUpgrade: false };
  }
}


// Decode JWT payload from Authorization header (to read custom claims like ai_agent)
function getJwtPayloadFromAuthHeader(req) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7);
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const headerJson = Buffer.from(parts[0], 'base64url').toString('utf8');
    const header = JSON.parse(headerJson);
    // Only warn+ignore HS256 (ID tokens); allow RS256/ES256 silently for best-effort read
    if (header?.alg === 'HS256') {
      console.warn(`[auth] Rejecting HS256 token for unauthenticated payload read (kid=${header.kid || 'none'})`);
      return null; // do not read unsigned claims from HS256 tokens
    }
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payloadJson);
  } catch (_) {
    return null;
  }
}

function isAiAgent(req) {
  // Prefer server-verified flag from authenticateUser
  if (typeof req?.is_ai_agent !== 'undefined') {
    return Boolean(req.is_ai_agent);
  }
  // Fallback: best-effort read from unsigned JWT payload (non-authoritative)
  const payload = getJwtPayloadFromAuthHeader(req);
  const claim = payload?.ai_agent || payload?.app_metadata?.ai_agent || payload?.user_metadata?.ai_agent;
  return claim === true || claim === 'true';
}

// ---------- middleware: block agent writes ----------
function blockAgentWrites(req, res, next) {
  const method = (req.method || '').toUpperCase();
  const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  const isRead = method === 'GET';
  if ((isWrite || (AGENT_BLOCK_READS && isRead)) && isAiAgent(req)) {
    const reason = isWrite ? 'agent_write_blocked_middleware' : 'agent_read_blocked_middleware';
    const routeLabel = req.baseUrl || req.path || '';
    // Audit + metrics for visibility
    recordAgentDeniedAttempt(req, reason, 403);
    incrementAgentWriteDenied(routeLabel, method, reason);
    return res.status(403).json({ error: 'Agent writes are not allowed' });
  }
  next();
}
// Apply guard early to ensure it runs before route handlers
app.use('/employees', blockAgentWrites);
app.use('/employee-shifts', blockAgentWrites);
app.use('/shifts', blockAgentWrites);
// Helpers for employee-shifts time fields (store as UTC timestamptz)
function hhmmToUtcIso(shift_date, hhmm) {
  // shift_date: YYYY-MM-DD, hhmm: HH:mm
  return `${shift_date}T${hhmm}:00Z`;
}

function formatTimeHHmm(isoOrTzString) {
  try {
    const d = new Date(isoOrTzString);
    // Return HH:mm in UTC to be consistent with storage
    return d.toISOString().slice(11, 16);
  } catch (_) {
    return null;
  }
}

function normalizeEmployeeName(name) {
  if (typeof name !== 'string') return '';
  return name.trim();
}

async function computeEmployeeSnapshot(managerId, employeeId) {
  // Resolve employee and ownership, then compute snapshots
  const { data: emp, error } = await supabase
    .from('employees')
    .select('id, manager_id, name, hourly_wage, tariff_level, archived_at')
    .eq('id', employeeId)
    .single();

  if (error || !emp || emp.manager_id !== managerId || emp.archived_at !== null) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Employee not found, archived, or does not belong to you'
    };
  }

  const rate = getTariffRate(emp.tariff_level);
  const hourly = (emp.tariff_level === 0 || emp.tariff_level === '0' || rate == null)
    ? (emp.hourly_wage != null ? Number(emp.hourly_wage) : null)
    : Number(rate);

  if (hourly == null || Number.isNaN(hourly)) {
    return { ok: false, statusCode: 400, error: 'Employee hourly wage is not configured' };
  }

  return {
    ok: true,
    snapshot: {
      employee_name_snapshot: emp.name,
      tariff_level_snapshot: emp.tariff_level ?? 0,
      hourly_wage_snapshot: hourly
    }
  };
}

// Find shifts by natural language reference
async function findShiftsByReference(user_id, dateReference, timeReference) {
  let targetDate = null;

  // Parse date reference
  if (dateReference) {
    targetDate = parseNaturalDate(dateReference);
  }

  if (!targetDate) {
    return { shifts: [], error: 'Kunne ikke forstå datoen' };
  }

  // Get shifts for the target date
  const { data: shifts, error } = await supabase
    .from('user_shifts')
    .select('*')
    .eq('user_id', user_id)
    .eq('shift_date', targetDate)
    .order('start_time');

  if (error) {
    return { shifts: [], error: 'Kunne ikke hente skift' };
  }

  if (!shifts || shifts.length === 0) {
    return { shifts: [], error: `Ingen skift funnet for ${targetDate}` };
  }

  // Filter by time reference if provided
  if (timeReference) {
    const timeRef = timeReference.toLowerCase().trim();
    let filteredShifts = shifts;

    if (timeRef.includes('morgen') || timeRef.includes('morning')) {
      // Morning shifts (before 12:00)
      filteredShifts = shifts.filter(shift => {
        const startHour = parseInt(shift.start_time.split(':')[0]);
        return startHour < 12;
      });
    } else if (timeRef.includes('kveld') || timeRef.includes('evening') || timeRef.includes('night')) {
      // Evening/night shifts (after 16:00)
      filteredShifts = shifts.filter(shift => {
        const startHour = parseInt(shift.start_time.split(':')[0]);
        return startHour >= 16;
      });
    } else if (timeRef.match(/^\d{1,2}:?\d{0,2}$/)) {
      // Specific time reference
      const normalizedTime = timeRef.includes(':') ? timeRef : `${timeRef}:00`;
      filteredShifts = shifts.filter(shift => shift.start_time === normalizedTime);
    }

    if (filteredShifts.length === 0) {
      return { shifts: [], error: `Ingen skift funnet for ${targetDate} med tidspunkt ${timeReference}` };
    }

    return { shifts: filteredShifts, error: null };
  }

  return { shifts, error: null };
}

// ---------- /config ----------
app.get('/config', async (req, res) => {
  try {
    // Feature flags configuration
    const features = {
      employees: process.env.FEATURE_EMPLOYEES !== 'false' // Default ON, can be disabled via env var
    };

    res.json({ features });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// ---------- /settings ----------
app.get('/settings', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    const bodyPreview = (() => { try { return JSON.stringify(req.body || {}); } catch (_) { return '[unserializable]'; }})();
  } catch (_) {}
  try {
    const userId = req?.auth?.userId || req?.user_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabase
      .from('user_settings')
      .select('custom_wage, profile_picture_url, show_employee_tab, pause_deduction_enabled, pause_deduction_method, pause_threshold_hours, pause_deduction_minutes, tax_deduction_enabled, tax_percentage, theme, default_shifts_view')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // If column missing, degrade gracefully
      const msg = (error?.message || '').toString();
      const isMissingColumn = (
        msg.includes('profile_picture_url') ||
        msg.includes('show_employee_tab') ||
        msg.includes('pause_deduction_enabled') ||
        msg.includes('pause_deduction_method') ||
        msg.includes('pause_threshold_hours') ||
        msg.includes('pause_deduction_minutes') ||
        msg.includes('tax_deduction_enabled') ||
        msg.includes('tax_percentage') ||
        msg.includes('theme') ||
        msg.includes('default_shifts_view') ||
        (error?.code === '42703')
      );
      const isMissingTable = (error?.code === '42P01') || msg.includes('relation') && msg.includes('does not exist');
      if (!isMissingColumn && !isMissingTable) {
        console.error('GET /settings db error:', msg, error?.stack || '');
        // Return debug info instead of raw 500 so client sees structured error
        return res.status(500).json({ error: msg, code: error?.code || null, stack: error?.stack || null });
      }
      // Degrade gracefully on schema drift (missing table/column)
      console.warn('GET /settings schema drift – degrading:', { code: error?.code, msg });
    }

    return res.json({
      custom_wage: data?.custom_wage ?? 0,
      profile_picture_url: data?.profile_picture_url ?? null,
      show_employee_tab: data?.show_employee_tab ?? true,
      pause_deduction_enabled: data?.pause_deduction_enabled ?? null,
      pause_deduction_method: data?.pause_deduction_method ?? null,
      pause_threshold_hours: data?.pause_threshold_hours ?? null,
      pause_deduction_minutes: data?.pause_deduction_minutes ?? null,
      tax_deduction_enabled: data?.tax_deduction_enabled ?? null,
      tax_percentage: data?.tax_percentage ?? null,
      theme: data?.theme ?? null,
      default_shifts_view: data?.default_shifts_view ?? null
    });
  } catch (e) {
    console.error('GET /settings error:', e?.message || e, e?.stack || '');
    return res.status(200).json({ custom_wage: 0, profile_picture_url: null, error: e?.message || String(e), stack: e?.stack || null });
  }
});

app.put('/settings', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    const bodyPreview = (() => { try { return JSON.stringify(req.body || {}); } catch (_) { return '[unserializable]'; }})();
  } catch (_) {}
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/settings', 'PUT', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const { custom_wage, profile_picture_url, show_employee_tab,
      pause_deduction_enabled, pause_deduction_method, pause_threshold_hours, pause_deduction_minutes,
      tax_deduction_enabled, tax_percentage, theme, default_shifts_view } = req.body || {};

    if (custom_wage !== undefined && custom_wage !== null && (typeof custom_wage !== 'number' || Number.isNaN(custom_wage))) {
      return res.status(400).json({ error: 'custom_wage must be a number' });
    }
    if (profile_picture_url !== undefined && profile_picture_url !== null && typeof profile_picture_url !== 'string') {
      return res.status(400).json({ error: 'profile_picture_url must be a string or null' });
    }
    if (show_employee_tab !== undefined && typeof show_employee_tab !== 'boolean') {
      return res.status(400).json({ error: 'show_employee_tab must be a boolean' });
    }
    if (pause_deduction_enabled !== undefined && typeof pause_deduction_enabled !== 'boolean') {
      return res.status(400).json({ error: 'pause_deduction_enabled must be a boolean' });
    }
    if (pause_deduction_method !== undefined) {
      const allowed = ['proportional','base_only','end_of_shift','none'];
      if (typeof pause_deduction_method !== 'string' || !allowed.includes(pause_deduction_method)) {
        return res.status(400).json({ error: 'pause_deduction_method invalid' });
      }
    }
    if (pause_threshold_hours !== undefined) {
      const v = Number(pause_threshold_hours);
      if (Number.isNaN(v) || v < 0 || v > 24) {
        return res.status(400).json({ error: 'pause_threshold_hours must be between 0 and 24' });
      }
    }
    if (pause_deduction_minutes !== undefined) {
      const v = Number(pause_deduction_minutes);
      if (!Number.isInteger(v) || v < 0 || v > 120) {
        return res.status(400).json({ error: 'pause_deduction_minutes must be an integer between 0 and 120' });
      }
    }

    if (tax_deduction_enabled !== undefined && typeof tax_deduction_enabled !== 'boolean') {
      return res.status(400).json({ error: 'tax_deduction_enabled must be a boolean' });
    }
    if (tax_percentage !== undefined) {
      const v = Number(tax_percentage);
      if (Number.isNaN(v) || v < 0 || v > 100) {
        return res.status(400).json({ error: 'tax_percentage must be between 0 and 100' });
      }
    }

    // Optional: validate theme and default_shifts_view when provided
    if (theme !== undefined) {
      const allowed = ['light', 'dark', 'system'];
      if (theme !== null && typeof theme !== 'string') {
        return res.status(400).json({ error: 'theme must be a string' });
      }
      if (theme && !allowed.includes(theme)) {
        return res.status(400).json({ error: 'theme must be one of light|dark|system' });
      }
    }
    if (default_shifts_view !== undefined) {
      const allowedViews = ['list', 'calendar'];
      if (default_shifts_view !== null && typeof default_shifts_view !== 'string') {
        return res.status(400).json({ error: 'default_shifts_view must be a string' });
      }
      if (default_shifts_view && !allowedViews.includes(default_shifts_view)) {
        return res.status(400).json({ error: 'default_shifts_view must be one of list|calendar' });
      }
    }

    const userId = req?.auth?.userId || req?.user_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const payload = { user_id: userId };
    if (custom_wage !== undefined) payload.custom_wage = custom_wage;
    if (profile_picture_url !== undefined) payload.profile_picture_url = profile_picture_url;
    if (show_employee_tab !== undefined) payload.show_employee_tab = show_employee_tab;
    if (pause_deduction_enabled !== undefined) payload.pause_deduction_enabled = pause_deduction_enabled;
    if (pause_deduction_method !== undefined) payload.pause_deduction_method = pause_deduction_method;
    if (pause_threshold_hours !== undefined) payload.pause_threshold_hours = pause_threshold_hours;
    if (pause_deduction_minutes !== undefined) payload.pause_deduction_minutes = pause_deduction_minutes;
    if (tax_deduction_enabled !== undefined) payload.tax_deduction_enabled = tax_deduction_enabled;
    if (tax_percentage !== undefined) payload.tax_percentage = tax_percentage;
    if (theme !== undefined) payload.theme = theme;
    if (default_shifts_view !== undefined) payload.default_shifts_view = default_shifts_view;

    let data = null; let error = null;
    try {
      const upsert = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select('custom_wage, profile_picture_url, show_employee_tab, theme, default_shifts_view')
        .single();
      data = upsert.data; error = upsert.error;
    } catch (e) {
      error = e;
    }

    if (error) {
      const msg = (error?.message || '').toString();
      const isMissingColumn = (
        msg.includes('profile_picture_url') ||
        msg.includes('show_employee_tab') ||
        msg.includes('pause_deduction_enabled') ||
        msg.includes('pause_deduction_method') ||
        msg.includes('pause_threshold_hours') ||
        msg.includes('pause_deduction_minutes') ||
        msg.includes('tax_deduction_enabled') ||
        msg.includes('tax_percentage') ||
        msg.includes('theme') ||
        msg.includes('default_shifts_view') ||
        (error?.code === '42703')
      );
      if (isMissingColumn) {
        // Retry without profile_picture_url when column missing
        const retryPayload = { user_id: userId };
        if (custom_wage !== undefined) retryPayload.custom_wage = custom_wage;
        // Intentionally skip other optional fields if columns are missing
        const retry = await supabase
          .from('user_settings')
          .upsert(retryPayload, { onConflict: 'user_id' })
          .select('custom_wage')
          .single();
        return res.json({ custom_wage: retry.data?.custom_wage ?? 0, profile_picture_url: null, show_employee_tab: true });
      }
      console.error('PUT /settings error:', msg, error?.stack || '');
      return res.status(500).json({ error: msg, code: error?.code || null, stack: error?.stack || null });
    }

    return res.json({
      custom_wage: data?.custom_wage ?? 0,
      profile_picture_url: data?.profile_picture_url ?? null,
      show_employee_tab: data?.show_employee_tab ?? true,
      pause_deduction_enabled: data?.pause_deduction_enabled ?? null,
      pause_deduction_method: data?.pause_deduction_method ?? null,
      pause_threshold_hours: data?.pause_threshold_hours ?? null,
      pause_deduction_minutes: data?.pause_deduction_minutes ?? null,
      tax_deduction_enabled: data?.tax_deduction_enabled ?? null,
      tax_percentage: data?.tax_percentage ?? null,
      theme: data?.theme ?? null,
      default_shifts_view: data?.default_shifts_view ?? null
    });
  } catch (e) {
    console.error('PUT /settings exception:', e?.message || e, e?.stack || '');
    return res.status(500).json({ error: e?.message || String(e), stack: e?.stack || null });
  }
});
// ---- DEBUG: list registered routes (recursive) ----
app.get('/routes-debug', (req, res) => {
  try {
    const seen = new Set();
    const routes = [];

    function collect(stack, prefix = '') {
      if (!stack) return;
      stack.forEach((layer) => {
        if (layer.route && layer.route.path) {
          const path = prefix + layer.route.path;
          const methods = Object.keys(layer.route.methods).filter(k => layer.route.methods[k]);
          const key = methods.sort().join(',') + ' ' + path;
          if (!seen.has(key)) {
            seen.add(key);
            routes.push({ path, methods });
          }
        } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
          // Nested router
          const nestedPrefix = layer.regexp && layer.regexp.source ? '' : prefix;
          collect(layer.handle.stack, nestedPrefix);
        }
      });
    }

    collect(app._router?.stack);
    res.json({ routes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// Minimal health route to confirm server instance
app.get('/ping', (req, res) => res.json({ ok: true }));

// Additional debug to inspect router internals
app.get('/routes-debug2', (req, res) => {
  try {
    const router = app._router;
    const stack = router && router.stack ? router.stack : [];
    const layers = stack.map((layer) => ({
      name: layer.name,
      path: layer.route ? layer.route.path : undefined,
      methods: layer.route ? Object.keys(layer.route.methods).filter(k => layer.route.methods[k]) : undefined,
      keys: layer.keys
    }));
    res.json({ hasRouter: !!router, stackCount: stack.length, layers });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ---------- /health/employees (deprecated: use /health or /health/deep) ----------
app.get('/health/employees', (req, res) => {
  // Tidligere inneholdt denne ruten tunge RLS/FK-sjekker via RPC.
  // Dette er fjernet for å hindre at liveness blir treg/ustabil.
  // Bruk /health for enkel liveness og /health/deep for lett DB-ping.
  res.status(200).json({ ok: true, note: 'use /health for liveness, /health/deep for db ping' });
});

// ---------- Employee CRUD endpoints ----------

app.post('/employees', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    const bodyPreview = (() => { try { return JSON.stringify(req.body || {}); } catch (_) { return '[unserializable]'; }})();
  } catch (_) {}
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/employees', 'POST', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }
    const managerId = req?.auth?.userId || req?.user_id;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });
    const { name, email, hourly_wage, tariff_level, birth_date, display_color } = req.body;

    const normalizedName = typeof name === 'string' ? normalizeEmployeeName(name) : '';

    // Validation: name is required
    if (!normalizedName || typeof normalizedName !== 'string' || normalizedName.length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validation: hourly_wage must be >= 0 if provided
    if (hourly_wage !== undefined && hourly_wage !== null) {
      const wage = parseFloat(hourly_wage);
      if (isNaN(wage) || wage < 0) {
        return res.status(400).json({ error: 'Hourly wage must be a number >= 0' });
      }
    }

    // Validation: tariff_level if provided
    if (tariff_level !== undefined && tariff_level !== null) {
      const allowed = [0, -2, -1, 1, 2, 3, 4, 5, 6];
      const lvl = parseInt(tariff_level);
      if (!allowed.includes(lvl)) {
        return res.status(400).json({ error: 'Invalid tariff_level' });
      }
    }

    // Validation: email format if provided
    if (email && typeof email === 'string' && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Validation: birth_date format if provided (YYYY-MM-DD)
    if (birth_date && typeof birth_date === 'string' && birth_date.trim().length > 0) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(birth_date.trim())) {
        return res.status(400).json({ error: 'Birth date must be in YYYY-MM-DD format' });
      }
    }

    // Check for unique (manager_id, name) constraint
    const { data: existingEmployee, error: checkError } = await supabase
      .from('employees')
      .select('id')
      .eq('manager_id', managerId)
      .eq('name', normalizedName)
      .is('archived_at', null)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing employee:', checkError);
      return res.status(500).json({ error: 'Failed to validate employee name' });
    }

    if (existingEmployee) {
      return res.status(409).json({ error: 'An employee with this name already exists' });
    }

    // Prepare employee data
    const lvlVal = (tariff_level !== undefined && tariff_level !== null) ? parseInt(tariff_level) : 0;
    let wageVal = (hourly_wage !== undefined && hourly_wage !== null) ? parseFloat(hourly_wage) : null;
    // If DB requires hourly_wage not null and using tariff, compute preset wage as fallback
    if ((wageVal === null || Number.isNaN(wageVal)) && lvlVal !== 0) {
      const preset = getTariffRate(lvlVal);
      if (preset != null) wageVal = Number(preset);
    }

    const employeeData = {
      manager_id: managerId,
      name: normalizedName,
      email: email && email.trim().length > 0 ? email.trim() : null,
      hourly_wage: wageVal,
      tariff_level: lvlVal,
      birth_date: birth_date && birth_date.trim().length > 0 ? birth_date.trim() : null,
      display_color: display_color && display_color.trim().length > 0 ? display_color.trim() : null
    };

    const { data: newEmployee, error: insertError } = await supabase
      .from('employees')
      .insert(employeeData)
      .select('id, name, email, hourly_wage, tariff_level, birth_date, display_color, created_at, archived_at')
      .single();

    if (insertError) {
      const msg = (insertError?.message || '').toString();
      console.error('Error creating employee:', msg, insertError?.stack || '');
      return res.status(500).json({ error: msg, code: insertError?.code || null, stack: insertError?.stack || null });
    }

    res.status(201).json({ employee: newEmployee });
  } catch (e) {
    console.error('POST /employees error:', e?.message || e, e?.stack || '');
    res.status(500).json({ error: e?.message || String(e), stack: e?.stack || null });
  }
});

/**
 * PUT /employees/:id - Update an existing employee
 * Body: { name?, email?, hourly_wage?, tariff_level?, birth_date?, display_color? }
 */
app.put('/employees/:id', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    const bodyPreview = (() => { try { return JSON.stringify(req.body || {}); } catch (_) { return '[unserializable]'; }})();
  } catch (_) {}
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/employees', 'PUT', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }
    const managerId = req?.auth?.userId || req?.user_id;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });
    const employeeId = req.params.id;
    const { name, email, hourly_wage, tariff_level, birth_date, display_color } = req.body;

    const normalizedName = (name !== undefined) ? normalizeEmployeeName(name) : undefined;

    // Verify the employee belongs to the current manager
    const { data: existingEmployee, error: fetchError } = await supabase
      .from('employees')
      .select('id, name, manager_id, tariff_level')
      .eq('id', employeeId)
      .single();

    if (fetchError || !existingEmployee || existingEmployee.manager_id !== managerId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validation: name is required if provided
    if (name !== undefined && (!normalizedName || normalizedName.length === 0)) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }

    // Validation: hourly_wage must be >= 0 if provided
    if (hourly_wage !== undefined && hourly_wage !== null) {
      const wage = parseFloat(hourly_wage);
      if (isNaN(wage) || wage < 0) {
        return res.status(400).json({ error: 'Hourly wage must be a number >= 0' });
      }
    }

    // Validation: tariff_level if provided
    if (tariff_level !== undefined && tariff_level !== null) {
      const allowed = [0, -2, -1, 1, 2, 3, 4, 5, 6];
      const lvl = parseInt(tariff_level);
      if (!allowed.includes(lvl)) {
        return res.status(400).json({ error: 'Invalid tariff_level' });
      }
    }

    // Validation: email format if provided
    if (email !== undefined && email !== null && typeof email === 'string' && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
    }

    // Validation: birth_date format if provided (YYYY-MM-DD)
    if (birth_date !== undefined && birth_date !== null && typeof birth_date === 'string' && birth_date.trim().length > 0) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(birth_date.trim())) {
        return res.status(400).json({ error: 'Birth date must be in YYYY-MM-DD format' });
      }
    }

    // Check for unique (manager_id, name) constraint if name is being updated
    if (normalizedName !== undefined && normalizedName !== existingEmployee.name) {
      const { data: duplicateEmployee, error: checkError } = await supabase
        .from('employees')
        .select('id')
        .eq('manager_id', managerId)
        .eq('name', normalizedName)
        .neq('id', employeeId)
        .is('archived_at', null)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking duplicate employee name:', checkError);
        return res.status(500).json({ error: 'Failed to validate employee name' });
      }

      if (duplicateEmployee) {
        return res.status(409).json({ error: 'An employee with this name already exists' });
      }
    }

    // Prepare update data (only include fields that are provided)
    const updateData = {};
    if (normalizedName !== undefined) updateData.name = normalizedName;
    if (email !== undefined) updateData.email = email && email.trim().length > 0 ? email.trim() : null;
    if (hourly_wage !== undefined) updateData.hourly_wage = hourly_wage !== null ? parseFloat(hourly_wage) : null;
    if (tariff_level !== undefined) updateData.tariff_level = tariff_level !== null ? parseInt(tariff_level) : 0;
    if (birth_date !== undefined) updateData.birth_date = birth_date && birth_date.trim().length > 0 ? birth_date.trim() : null;
    if (display_color !== undefined) updateData.display_color = display_color && display_color.trim().length > 0 ? display_color.trim() : null;

    const { data: updatedEmployee, error: updateError } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId)
      .eq('manager_id', managerId)
      .select('id, name, email, hourly_wage, tariff_level, birth_date, display_color, created_at, archived_at')
      .single();

    if (updateError) {
      const msg = (updateError?.message || '').toString();
      console.error('Error updating employee:', msg, updateError?.stack || '');
      return res.status(500).json({ error: msg, code: updateError?.code || null, stack: updateError?.stack || null });
    }

    res.json({ employee: updatedEmployee });
  } catch (e) {
    console.error('PUT /employees/:id error:', e?.message || e, e?.stack || '');
    res.status(500).json({ error: e?.message || String(e), stack: e?.stack || null });
  }
});

/**
 * DELETE /employees/:id - Soft delete an employee (set archived_at)
 */
app.delete('/employees/:id', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    const bodyPreview = (() => { try { return JSON.stringify(req.body || {}); } catch (_) { return '[unserializable]'; }})();
  } catch (_) {}
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/employees', 'DELETE', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }
    const managerId = req?.auth?.userId || req?.user_id;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });
    const employeeId = req.params.id;

    // Verify the employee belongs to the current manager
    const { data: existingEmployee, error: fetchError } = await supabase
      .from('employees')
      .select('id, manager_id, archived_at')
      .eq('id', employeeId)
      .single();

    if (fetchError || !existingEmployee || existingEmployee.manager_id !== managerId) {
      const msg = (fetchError?.message || '').toString();
      if (fetchError) console.error('Error fetching employee for delete:', msg, fetchError?.stack || '');
      return res.status(403).json({ error: 'Forbidden', code: fetchError?.code || null, stack: fetchError?.stack || null });
    }

    // Check if already archived
    if (existingEmployee.archived_at) {
      return res.status(409).json({ error: 'Employee is already archived' });
    }

    // Soft delete by setting archived_at timestamp
    const { data: archivedEmployee, error: archiveError } = await supabase
      .from('employees')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', employeeId)
      .eq('manager_id', managerId)
      .select('id, name, email, hourly_wage, tariff_level, birth_date, display_color, created_at, archived_at')
      .single();

    if (archiveError) {
      console.error('Error archiving employee:', archiveError);
      return res.status(500).json({ error: 'Failed to archive employee' });
    }

    res.json({ employee: archivedEmployee, message: 'Employee archived successfully' });
  } catch (e) {
    console.error('DELETE /employees/:id error:', e?.message || e, e?.stack || '');
    res.status(500).json({ error: e?.message || String(e), stack: e?.stack || null });
  }
});

// ---------- Employee Shifts CRUD endpoints ----------

/**
 * GET /employee-shifts
 * Query: employee_id?, from?, to?, page?, limit?
 */
app.get('/employee-shifts', authenticateUser, async (req, res) => {
  try {
    const managerId = req.user_id;
    const { employee_id, from, to } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    // If employee_id provided, ensure ownership
    if (employee_id) {
      const { data: emp, error } = await supabase
        .from('employees')
        .select('id, manager_id, archived_at')
        .eq('id', employee_id)
        .single();
      if (error || !emp || emp.manager_id !== managerId || emp.archived_at !== null) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    let query = supabase
      .from('employee_shifts')
      .select('id, manager_id, employee_id, employee_name_snapshot, tariff_level_snapshot, hourly_wage_snapshot, shift_date, start_time, end_time, break_minutes, notes, created_at, updated_at', { count: 'exact' })
      .eq('manager_id', managerId)
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);

    if (employee_id) query = query.eq('employee_id', employee_id);
    if (from) query = query.gte('shift_date', from);
    if (to) query = query.lte('shift_date', to);

    const { data: rows, error, count } = await query;
    if (error) {
      console.error('GET /employee-shifts error:', error);
      return res.status(500).json({ error: 'Failed to fetch employee shifts' });
    }

    // Load organization settings
    const orgSettings = await getOrgSettings(managerId);

    const shifts = (rows || []).map(r => {
      const startHHmm = formatTimeHHmm(r.start_time);
      const endHHmm = formatTimeHHmm(r.end_time);
      const calc = calcEmployeeShift({
        start_time: startHHmm,
        end_time: endHHmm,
        break_minutes: r.break_minutes || 0,
        hourly_wage_snapshot: Number(r.hourly_wage_snapshot)
      }, orgSettings);

      return {
        id: r.id,
        employee_id: r.employee_id,
        employee_name_snapshot: r.employee_name_snapshot,
        tariff_level_snapshot: r.tariff_level_snapshot,
        hourly_wage_snapshot: Number(r.hourly_wage_snapshot),
        shift_date: r.shift_date,
        start_time: startHHmm,
        end_time: endHHmm,
        break_minutes: r.break_minutes,
        notes: r.notes,
        created_at: r.created_at,
        updated_at: r.updated_at,
        break_policy_used: calc.breakPolicyUsed,
        duration_hours: calc.durationHours,
        paid_hours: calc.paidHours,
        gross: calc.gross
      };
    });

    return res.json({
      shifts,
      page,
      limit,
      total: count ?? shifts.length
    });
  } catch (e) {
    console.error('GET /employee-shifts exception:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /employee-shifts
 * Body: { employee_id, shift_date, start_time, end_time, break_minutes?, notes? }
 */
app.post('/employee-shifts', authenticateUser, async (req, res) => {
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/employee-shifts', 'POST', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const managerId = req.user_id;
    const { employee_id, shift_date, start_time, end_time, break_minutes = 0, notes } = req.body || {};

    // Required fields
    if (!employee_id || !shift_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields: employee_id, shift_date, start_time, end_time' });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shift_date)) {
      return res.status(400).json({ error: 'Invalid shift_date format. Use YYYY-MM-DD' });
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:mm' });
    }

    // Validate break_minutes
    const breakMins = parseInt(break_minutes) || 0;
    if (breakMins < 0) {
      return res.status(400).json({ error: 'Break minutes must be >= 0' });
    }

    // Ensure employee ownership
    const { data: emp, error } = await supabase
      .from('employees')
      .select('id, manager_id, archived_at')
      .eq('id', employee_id)
      .single();

    if (error || !emp || emp.manager_id !== managerId || emp.archived_at !== null) {
      return res.status(403).json({ error: 'Forbidden or employee not found' });
    }

    // Check for duplicate shift (same employee, date, start, end)
    const { data: existingShift, error: dupError } = await supabase
      .from('employee_shifts')
      .select('id')
      .eq('manager_id', managerId)
      .eq('employee_id', employee_id)
      .eq('shift_date', shift_date)
      .eq('start_time', hhmmToUtcIso(shift_date, start_time))
      .eq('end_time', hhmmToUtcIso(shift_date, end_time))
      .maybeSingle();

    if (dupError) {
      console.error('Error checking duplicate employee shift:', dupError);
      return res.status(500).json({ error: 'Failed to validate shift data' });
    }

    if (existingShift) {
      return res.status(409).json({ error: 'A shift with these details already exists' });
    }

    // Compute employee snapshot
    const snapshot = await computeEmployeeSnapshot(managerId, employee_id);
    if (!snapshot) {
      return res.status(500).json({ error: 'Failed to compute employee snapshot' });
    }

    // Create employee shift
    const { data: newShift, error: insertError } = await supabase
      .from('employee_shifts')
      .insert({
        manager_id: managerId,
        employee_id: employee_id,
        employee_name_snapshot: snapshot.name,
        tariff_level_snapshot: snapshot.tariff_level,
        hourly_wage_snapshot: snapshot.hourly_wage,
        shift_date: shift_date,
        start_time: hhmmToUtcIso(shift_date, start_time),
        end_time: hhmmToUtcIso(shift_date, end_time),
        break_minutes: breakMins,
        notes: notes?.trim() || null
      })
      .select('id, manager_id, employee_id, employee_name_snapshot, tariff_level_snapshot, hourly_wage_snapshot, shift_date, start_time, end_time, break_minutes, notes, created_at, updated_at')
      .single();

    if (insertError) {
      console.error('Error creating employee shift:', insertError);
      return res.status(500).json({ error: 'Failed to create employee shift' });
    }

    // Load organization settings for calculations
    const orgSettings = await getOrgSettings(managerId);
    const startHHmm = formatTimeHHmm(newShift.start_time);
    const endHHmm = formatTimeHHmm(newShift.end_time);
    const calc = calcEmployeeShift({
      start_time: startHHmm,
      end_time: endHHmm,
      break_minutes: newShift.break_minutes || 0,
      hourly_wage_snapshot: Number(newShift.hourly_wage_snapshot)
    }, orgSettings);

    const responseShift = {
      id: newShift.id,
      employee_id: newShift.employee_id,
      employee_name_snapshot: newShift.employee_name_snapshot,
      tariff_level_snapshot: newShift.tariff_level_snapshot,
      hourly_wage_snapshot: Number(newShift.hourly_wage_snapshot),
      shift_date: newShift.shift_date,
      start_time: startHHmm,
      end_time: endHHmm,
      break_minutes: newShift.break_minutes,
      notes: newShift.notes,
      created_at: newShift.created_at,
      updated_at: newShift.updated_at,
      break_policy_used: calc.breakPolicyUsed,
      duration_hours: calc.durationHours,
      paid_hours: calc.paidHours,
      gross: calc.gross
    };

    return res.status(201).json({ shift: responseShift });
  } catch (e) {
    console.error('POST /employee-shifts exception:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /employee-shifts/:id
 * Body: { shift_date?, start_time?, end_time?, break_minutes?, notes? }
 */
app.put('/employee-shifts/:id', authenticateUser, async (req, res) => {
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/employee-shifts', 'PUT', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const managerId = req.user_id;
    const shiftId = req.params.id;
    const { shift_date, start_time, end_time, break_minutes, notes } = req.body || {};

    // Verify the shift belongs to the current manager
    const { data: existingShift, error: fetchError } = await supabase
      .from('employee_shifts')
      .select('*')
      .eq('id', shiftId)
      .eq('manager_id', managerId)
      .single();

    if (fetchError || !existingShift) {
      return res.status(404).json({ error: 'Employee shift not found' });
    }

    // Validate date format if provided
    if (shift_date && !/^\d{4}-\d{2}-\d{2}$/.test(shift_date)) {
      return res.status(400).json({ error: 'Invalid shift_date format. Use YYYY-MM-DD' });
    }

    // Validate time format if provided
    if (start_time && !/^\d{2}:\d{2}$/.test(start_time)) {
      return res.status(400).json({ error: 'Invalid start_time format. Use HH:mm' });
    }
    if (end_time && !/^\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ error: 'Invalid end_time format. Use HH:mm' });
    }

    // Validate break_minutes if provided
    if (break_minutes !== undefined) {
      const breakMins = parseInt(break_minutes);
      if (isNaN(breakMins) || breakMins < 0) {
        return res.status(400).json({ error: 'Break minutes must be >= 0' });
      }
    }

    // Build update object
    const updateData = {};
    const finalDate = shift_date || existingShift.shift_date;

    if (shift_date !== undefined) updateData.shift_date = shift_date;
    if (start_time !== undefined) updateData.start_time = hhmmToUtcIso(finalDate, start_time);
    if (end_time !== undefined) updateData.end_time = hhmmToUtcIso(finalDate, end_time);
    if (break_minutes !== undefined) updateData.break_minutes = parseInt(break_minutes);
    if (notes !== undefined) updateData.notes = notes?.trim() || null;

    // Check for duplicate if key fields are changing
    const finalStartTime = start_time || formatTimeHHmm(existingShift.start_time);
    const finalEndTime = end_time || formatTimeHHmm(existingShift.end_time);

    if (shift_date || start_time || end_time) {
      const { data: duplicateShift, error: dupError } = await supabase
        .from('employee_shifts')
        .select('id')
        .eq('manager_id', managerId)
        .eq('employee_id', existingShift.employee_id)
        .eq('shift_date', finalDate)
        .eq('start_time', hhmmToUtcIso(finalDate, finalStartTime))
        .eq('end_time', hhmmToUtcIso(finalDate, finalEndTime))
        .neq('id', shiftId)
        .maybeSingle();

      if (dupError) {
        console.error('Error checking duplicate employee shift:', dupError);
        return res.status(500).json({ error: 'Failed to validate shift data' });
      }

      if (duplicateShift) {
        return res.status(409).json({ error: 'A shift with these details already exists' });
      }
    }

    // Update the shift
    const { data: updatedShift, error: updateError } = await supabase
      .from('employee_shifts')
      .update(updateData)
      .eq('id', shiftId)
      .eq('manager_id', managerId)
      .select('id, manager_id, employee_id, employee_name_snapshot, tariff_level_snapshot, hourly_wage_snapshot, shift_date, start_time, end_time, break_minutes, notes, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('Error updating employee shift:', updateError);
      return res.status(500).json({ error: 'Failed to update employee shift' });
    }

    // Load organization settings for calculations
    const orgSettings = await getOrgSettings(managerId);
    const startHHmm = formatTimeHHmm(updatedShift.start_time);
    const endHHmm = formatTimeHHmm(updatedShift.end_time);
    const calc = calcEmployeeShift({
      start_time: startHHmm,
      end_time: endHHmm,
      break_minutes: updatedShift.break_minutes || 0,
      hourly_wage_snapshot: Number(updatedShift.hourly_wage_snapshot)
    }, orgSettings);

    const responseShift = {
      id: updatedShift.id,
      employee_id: updatedShift.employee_id,
      employee_name_snapshot: updatedShift.employee_name_snapshot,
      tariff_level_snapshot: updatedShift.tariff_level_snapshot,
      hourly_wage_snapshot: Number(updatedShift.hourly_wage_snapshot),
      shift_date: updatedShift.shift_date,
      start_time: startHHmm,
      end_time: endHHmm,
      break_minutes: updatedShift.break_minutes,
      notes: updatedShift.notes,
      created_at: updatedShift.created_at,
      updated_at: updatedShift.updated_at,
      break_policy_used: calc.breakPolicyUsed,
      duration_hours: calc.durationHours,
      paid_hours: calc.paidHours,
      gross: calc.gross
    };

    return res.json({ shift: responseShift });
  } catch (e) {
    console.error('PUT /employee-shifts/:id exception:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /employee-shifts/:id
 */
app.delete('/employee-shifts/:id', authenticateUser, async (req, res) => {
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/employee-shifts', 'DELETE', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const managerId = req.user_id;
    const shiftId = req.params.id;

    // Verify the shift belongs to the current manager
    const { data: existingShift, error: fetchError } = await supabase
      .from('employee_shifts')
      .select('id, manager_id')
      .eq('id', shiftId)
      .eq('manager_id', managerId)
      .single();

    if (fetchError || !existingShift) {
      return res.status(404).json({ error: 'Employee shift not found' });
    }

    // Delete the shift
    const { error: deleteError } = await supabase
      .from('employee_shifts')
      .delete()
      .eq('id', shiftId)
      .eq('manager_id', managerId);

    if (deleteError) {
      console.error('Error deleting employee shift:', deleteError);
      return res.status(500).json({ error: 'Failed to delete employee shift' });
    }

    return res.status(204).send();
  } catch (e) {
    console.error('DELETE /employee-shifts/:id exception:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server (kun när filen kjöres direkte)
const isRunDirectly = (() => {
  try {
    const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
    return fileURLToPath(import.meta.url) === invokedPath;
  } catch {
    return false;
  }
})();

if (isRunDirectly) {
  const PORT = process.env.PORT || 10000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✔ Server running → http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown to reduce dropped requests during restarts
  const shutdownSignals = ['SIGTERM', 'SIGINT'];
  const GRACE_MS = parseInt(process.env.GRACEFUL_SHUTDOWN_MS || '25000', 10);
  let shuttingDown = false;

  function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] Received ${signal}. Stopping server, grace=${GRACE_MS}ms`);
    try {
      server.close(err => {
        if (err) {
          console.error('[shutdown] server.close error:', err?.message || err);
        }
        process.exit(0);
      });
      // Force exit after grace period
      setTimeout(() => {
        console.warn('[shutdown] Grace period elapsed; forcing exit');
        process.exit(0);
      }, Math.max(1000, GRACE_MS)).unref();
    } catch (e) {
      console.error('[shutdown] exception:', e?.message || e);
      process.exit(0);
    }
  }

  for (const sig of shutdownSignals) {
    process.on(sig, () => gracefulShutdown(sig));
  }
}
