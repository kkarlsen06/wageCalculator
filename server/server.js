// ===== server.js =====
console.log('[BOOT] Using server file:', import.meta.url);
console.log('[BOOT] CWD:', process.cwd());

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
} else {
  console.log("[boot] Stripe configured");
}


import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { calcEmployeeShift } from './payroll/calc.js';
import { randomUUID } from 'node:crypto';
import { verifySupabaseJWT, getUidFromAuthHeader } from './lib/auth/verifySupabaseJwt.js';
import { authMiddleware } from './middleware/auth.js';
import Stripe from 'stripe';
import { WebSocketServer } from 'ws';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { createServer } from 'http';
import { SYSTEM_PROMPT } from './lib/agentPrompt.js';
// Node 22+ has global fetch; use Stripe REST API to avoid extra deps

// ---------- path helpers ----------
const FRONTEND_DIR = __dirname;

// Public base URL for the app (used in Stripe redirects)
// Prefer env var to allow staging/preview environments
const APP_BASE_URL = process.env.PUBLIC_APP_BASE_URL || 'https://kalkulator.kkarlsen.dev';

// ---------- app & core middleware ----------
const app = express();

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

// Note: express.static is registered after API routes to avoid intercepting API paths
// ---------- third-party clients ----------
const openai = (() => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.warn('[BOOT] OPENAI_API_KEY not set – OpenAI features disabled.');
    return null;
  }
  try {
    return new OpenAI({ apiKey: key });
  } catch (e) {
    console.warn('[BOOT] Failed to initialize OpenAI client:', e?.message || e);
    return null;
  }
})();

// -------- Agent loop config & transient storage --------
// Agent loop for Chat Completions — how it works:
// - Maintains a single messages array in OpenAI chat format.
// - Calls chat.completions.create; if tool_calls are returned, executes them
//   (concurrently when multiple), appends results as tool messages, and loops.
// - Emits lightweight SSE events for tool_call and tool_result (no raw payloads).
// - Enforces limits: 10 iterations, 20s per tool, 120s wall clock per request.
// - Truncates tool output to <= 8000 chars; if larger, stores in-memory and
//   passes a handle + preview back to the model.
const MAX_ITERATIONS = 10;
const PER_TOOL_TIMEOUT_MS = 20_000;
const WALL_CLOCK_CAP_MS = 120_000;
const MODEL_TOOL_OUTPUT_TRUNCATE = 8000;
const TOOL_PREVIEW_LEN = 512;

// simple in-memory store for oversized tool outputs
const TOOL_OUTPUT_STORE = new Map(); // key: uuid -> full string

function truncateToolOutput(content) {
  try {
    let s = typeof content === 'string' ? content : JSON.stringify(content);
    const size_bytes = Buffer.byteLength(s || '', 'utf8');
    if (!s) return { content: '', size_bytes, stored: false };
    if (s.length <= MODEL_TOOL_OUTPUT_TRUNCATE) {
      return { content: s, size_bytes, stored: false };
    }
    const uuid = randomUUID();
    TOOL_OUTPUT_STORE.set(uuid, s);
    const handlePayload = {
      handle: `tool://${uuid}`,
      preview: s.slice(0, TOOL_PREVIEW_LEN)
    };
    return { content: JSON.stringify(handlePayload), size_bytes, stored: true, handle: uuid };
  } catch (_) {
    const fallback = String(content ?? '');
    return { content: fallback.slice(0, MODEL_TOOL_OUTPUT_TRUNCATE), size_bytes: Buffer.byteLength(fallback, 'utf8'), stored: false };
  }
}

function withTimeoutPromise(p, ms) {
  return Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error('tool_timeout')), ms))
  ]);
}

// Emit lightweight progress event over WebSocket and console, and trace per-connection
function emitProgress(ws, obj) {
  const msg = { type: 'progress', ...obj, ts: Date.now() };
  try { if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg)); } catch {}
  try { console.log(JSON.stringify(obj)); } catch {}
  try {
    if (ws && Array.isArray(ws._trace)) {
      ws._trace_idx = (ws._trace_idx || 0) + 1;
      ws._trace.push({ idx: ws._trace_idx, ...obj, ts: msg.ts });
    }
  } catch {}
}

async function runToolWithTimeout(call, user_id, iter, res, ws) {
  const start = Date.now();
  const name = call?.function?.name || 'unknown';
  let ok = true;
  let rawOutput = '';
  try {
    // Emit SSE tool_call summary event (no raw args)
    if (res) {
      const argsSummary = (() => {
        try {
          const a = call?.function?.arguments || '';
          return String(a).slice(0, 240);
        } catch { return ''; }
      })();
      res.write(`data: ${JSON.stringify({ type: 'tool_call', iteration: iter, name, argsSummary, id: call.id })}\n\n`);
    }

    rawOutput = await withTimeoutPromise(handleTool(call, user_id), PER_TOOL_TIMEOUT_MS);
  } catch (e) {
    ok = false;
    rawOutput = JSON.stringify({ error: e?.message || String(e) });
  }
  const duration_ms = Date.now() - start;
  const { content, size_bytes } = truncateToolOutput(rawOutput);
  // Structured tool log + WS progress
  emitProgress(ws, { phase: 'tool', iter, name, ok, duration_ms, out_len: size_bytes });
  // Emit SSE tool_result summary
  if (res) {
    res.write(`data: ${JSON.stringify({ type: 'tool_result', iteration: iter, name, ok, duration_ms, size_bytes, id: call.id })}\n\n`);
  }
  return { content, size_bytes, ok };
}

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
    console.log("[/api/billing/start] begin");

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

    console.log(`[billing] uid=${uid} customer=pending session=pending`);

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
        console.log(`[billing] Found existing customer: ${customerId}`);
        
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
        console.log(`[billing] Created new customer: ${customerId}`);
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
          console.log('[billing] Mapping upsert ok:', data);
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
    console.log(`[billing] uid=${uid} customer=${customerId} session=${sessionData.id}`);
    
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
    console.log("[/api/checkout] begin, hasStripe=", !!process.env.STRIPE_SECRET_KEY);

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
    console.log('[stripe urls]', { success_url, cancel_url, return_url: `${APP_BASE_URL}/index.html` });


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
    try { console.log("[/api/checkout] ensured customer", { customerId, userId, email: userEmail }); } catch (_) {}

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

	    console.log("[/api/checkout] attaching metadata", { userId, customerId });


    return res.json({ url: data.url });
  } catch (e) {
    console.error('[/api/checkout] Exception:', e?.message || e, e?.stack || '');
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Back-compat route without /api prefix in case of different proxy setups
app.post('/checkout', authenticateUser, async (req, res) => {
  try {
    console.log("[/checkout] back-compat route hit");

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
    console.log('[stripe urls]', { return_url });

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

    try { console.log('[/api/stripe/create-portal-session] ok', { userId, customerId, returnUrl }); } catch (_) {}

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
    console.log('[stripe urls]', { return_url });

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
  console.log("[webhook] hit", req.headers['stripe-signature']);

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
        console.log(`[webhook] Skipping already processed event: ${eventId}`);
        return;
      }
      processedEventsCache.add(eventId);

      const type = verifiedEvent?.type || '';
      console.log(`[webhook] type=${type} uid=pending customer=pending`);

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
          console.log(`[webhook] checkout.session.completed - uid=${uid || 'null'} customer=${customerId || 'null'} subscription=${subscriptionId || 'null'}`);
        } else if (type.startsWith('customer.subscription.')) {
          const obj = verifiedEvent?.data?.object || {};
          subscriptionId = obj?.id || null;
          status = obj?.status || null;
          periodEndUnix = obj?.current_period_end || null;
          priceId = obj?.items?.data?.[0]?.price?.id || null;

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
              if (!periodEndUnix) periodEndUnix = sub?.current_period_end || periodEndUnix || null;
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

          console.log('[webhook] customer.subscription.event - uid=%s customer=%s subscription=%s status=%s',
            uid || 'null',
            customerId || 'null',
            subscriptionId || 'null',
            status || 'null'
          );
        }

        // Log final resolution
        console.log('[webhook] %s - uid=%s customer=%s subscription=%s',
            type,
            uid || 'null',
            customerId || 'null',
            subscriptionId || 'null'
          );

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
              console.log(`[webhook] Updated customer<->UID mapping: ${customerId} <-> ${uid}`);
            }
          } catch (dbErr) {
            console.warn('[webhook] Database mapping error:', dbErr.message);
          }
        }

        // Handle subscription-specific events
        if (type.startsWith('customer.subscription.') && subscriptionId && status) {
          console.log(`[webhook] Processing subscription ${subscriptionId} with status ${status}`);
          
          try {
            if (status === 'active' || status === 'trialing') {
              // Create or update subscription record
              const { data, error } = await supabase
                .from('subscriptions')
                .upsert({
                  user_id: uid,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  status: status,
                  current_period_end: periodEndUnix ? new Date(Number(periodEndUnix) * 1000).toISOString() : null,
                  ...(priceId && { price_id: priceId })
                }, { 
                  onConflict: 'user_id',
                  ignoreDuplicates: false 
                });
                
              if (error) {
                console.error(`[webhook] Subscription upsert failed: ${error.message}`);
              } else {
                console.log(`[webhook] Updated subscription: ${subscriptionId} -> ${status}`);
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
                console.log(`[webhook] Updated subscription status: ${subscriptionId} -> ${status}`);
              }
            }
          } catch (e) {
            console.error('[webhook] Database operation failed:', e.message);
          }
        }
        
      } else {
        console.log(`[webhook] Ignoring unsupported event type: ${type}`);
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

    console.log('[health-check] Unlinked objects summary:', summary);

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
      
      console.log('[admin/link-customer] Updated Stripe customer:', { 
        customerId: stripe_customer_id, 
        userId: supabase_user_id,
        email: customer.email 
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

// ---------- GPT tool schema ----------
const addShiftSchema = {
  name: 'addShift',
  description: 'Add one work shift',
  parameters: {
    type: 'object',
    properties: {
      shift_date: { type: 'string', description: 'YYYY-MM-DD', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      start_time: { type: 'string', description: 'HH:mm', pattern: '^\\d{2}:\\d{2}$' },
      end_time:   { type: 'string', description: 'HH:mm', pattern: '^\\d{2}:\\d{2}$' }
    },
    required: ['shift_date', 'start_time', 'end_time']
  }
};

const addSeriesSchema = {
  name: 'addSeries',
  description: 'Add multiple identical shifts over a date range',
  parameters: {
    type: 'object',
    properties: {
      from_date:  { type: 'string', description: 'First day YYYY-MM-DD', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      to_date:    { type: 'string', description: 'Last day YYYY-MM-DD (inclusive)', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      days:  { type: 'array',  items: { type: 'integer' }, description: 'Weekdays 0-6' },
      start: { type: 'string', description: 'Shift start HH:mm', pattern: '^\\d{2}:\\d{2}$' },
      end:   { type: 'string', description: 'Shift end   HH:mm', pattern: '^\\d{2}:\\d{2}$' },
      interval_weeks: { type: 'integer', description: 'Interval in weeks (1=every week, 2=every other week, etc.)', default: 1 },
      offset_start: { type: 'integer', description: 'Week offset from start date (0=no offset)', default: 0 }
    },
    required: ['from_date', 'to_date', 'days', 'start', 'end']
  }
};

const editShiftSchema = {
  name: 'editShift',
  description: 'Edit an existing work shift. Can identify shift by ID, specific date/time, or natural language (e.g., "tomorrow", "Monday", "next week"). Can update date, start time, end time, or shift type.',
  parameters: {
    type: 'object',
    properties: {
      shift_id: { type: 'integer', description: 'ID of shift to edit (optional if other identifiers provided)' },
      shift_date: { type: 'string', description: 'Specific date of shift to edit YYYY-MM-DD (optional)', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      start_time: { type: 'string', description: 'Start time of shift to edit HH:mm (optional, used with shift_date)', pattern: '^\\d{2}:\\d{2}$' },
      date_reference: { type: 'string', description: 'Natural language date reference like "tomorrow", "Monday", "next Tuesday", "today" (optional)' },
      time_reference: { type: 'string', description: 'Time reference like "morning shift", "evening shift", or specific time "09:00" (optional)' },
      new_start_time: { type: 'string', description: 'New start time HH:mm (optional)', pattern: '^\\d{2}:\\d{2}$' },
      new_end_time: { type: 'string', description: 'New end time HH:mm (optional)', pattern: '^\\d{2}:\\d{2}$' },
      end_time: { type: 'string', description: 'New end time HH:mm (optional, legacy alias of new_end_time)', pattern: '^\\d{2}:\\d{2}$' },
      new_shift_date: { type: 'string', description: 'New date YYYY-MM-DD (optional)', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      new_shift_type: { type: 'integer', description: 'New shift type (integer) (optional)' }
    },
    required: []
  }
};

const deleteShiftSchema = {
  name: 'deleteShift',
  description: 'Delete a single work shift. Can identify shift by ID, specific date/time, or natural language (e.g., "tomorrow", "Monday", "the shift at 9am today").',
  parameters: {
    type: 'object',
    properties: {
      shift_id: { type: 'integer', description: 'ID of shift to delete (optional if other identifiers provided)' },
      shift_date: { type: 'string', description: 'Specific date of shift to delete YYYY-MM-DD (optional)', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      start_time: { type: 'string', description: 'Start time of shift to delete HH:mm (optional, used with shift_date)', pattern: '^\\d{2}:\\d{2}$' },
      date_reference: { type: 'string', description: 'Natural language date reference like "tomorrow", "Monday", "next Tuesday", "today" (optional)' },
      time_reference: { type: 'string', description: 'Time reference like "morning shift", "evening shift", or specific time "09:00" (optional)' }
    },
    required: []
  }
};

const deleteSeriesSchema = {
  name: 'deleteSeries',
  description: 'Delete multiple shifts by criteria (week, date range, series) or by specific IDs. If shift_ids is provided, other criteria are ignored.',
  parameters: {
    type: 'object',
    properties: {
      shift_ids: { type: 'array', items: { type: 'integer' }, description: 'Array of specific shift IDs to delete. If provided, ignores all other criteria.' },
      criteria_type: {
        type: 'string',
        enum: ['week', 'date_range', 'series_id'],
        description: 'Type of deletion criteria. Use "week" for next week deletion. Ignored if shift_ids is provided.'
      },
      week_number: { type: 'integer', description: 'Week number (1-53) when criteria_type=week. Optional - if not provided, deletes next week.' },
      year: { type: 'integer', description: 'Year for week deletion. Optional - if not provided, deletes next week.' },
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD when criteria_type=date_range', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD when criteria_type=date_range', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      series_id: { type: 'string', description: 'Series ID when criteria_type=series_id' }
    },
    required: []
  }
};

const getShiftsSchema = {
  name: 'getShifts',
  description: 'Get existing shifts by criteria (week, date range, next weeks, or all). For "denne uka" use criteria_type=week without week_number/year.',
  parameters: {
    type: 'object',
    properties: {
      criteria_type: {
        type: 'string',
        enum: ['week', 'date_range', 'next', 'all'],
        description: 'Type of query criteria. Use "week" for current week or "next" for next week.',
        default: 'week'
      },
      week_number: { type: 'integer', description: 'Week number (1-53) when criteria_type=week. Optional - if not provided, gets current week.' },
      year: { type: 'integer', description: 'Year for week query. Optional - if not provided, gets current week.' },
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD when criteria_type=date_range', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD when criteria_type=date_range', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      num_weeks: { type: 'integer', description: 'Number of weeks to get when criteria_type=next (default 1)', default: 1 }
    },
    required: ['criteria_type']
  }
};

const copyShiftSchema = {
  name: 'copyShift',
  description: 'Find a shift by natural language reference and copy it to future dates. Combines finding and copying in one operation.',
  parameters: {
    type: 'object',
    properties: {
      source_date_reference: { type: 'string', description: 'Natural language reference to source shift date like "Monday", "last Tuesday", "yesterday"' },
      source_time_reference: { type: 'string', description: 'Time reference for source shift like "morning", "evening", or specific time "09:00" (optional)' },
      target_dates: { type: 'array', items: { type: 'string' }, description: 'Array of target dates in YYYY-MM-DD format to copy the shift to' },
      target_date_references: { type: 'array', items: { type: 'string' }, description: 'Array of natural language date references like ["next Monday", "next Tuesday"] (alternative to target_dates)' },
      weeks_ahead: { type: 'integer', description: 'Number of weeks ahead to copy the shift (alternative to target_dates/target_date_references)' }
    },
    required: ['source_date_reference']
  }
};

const getWageDataByWeekSchema = {
  name: 'getWageDataByWeek',
  description: 'Get detailed wage data for a specific week including shift duration, earnings breakdown, and totals.',
  parameters: {
    type: 'object',
    properties: {
      week_number: { type: 'integer', description: 'Week number (1-53). Optional - if not provided, gets current week.', minimum: 1, maximum: 53 },
      year: { type: 'integer', description: 'Year for week query. Optional - if not provided, gets current week.' }
    },
    required: []
  }
};

const getWageDataByMonthSchema = {
  name: 'getWageDataByMonth',
  description: 'Get detailed wage data for a specific month including shift duration, earnings breakdown, and totals.',
  parameters: {
    type: 'object',
    properties: {
      month: { type: 'integer', description: 'Month number (1-12). Optional - if not provided, uses current viewing month.', minimum: 1, maximum: 12 },
      year: { type: 'integer', description: 'Year. Optional - if not provided, uses current viewing year.' }
    },
    required: []
  }
};

const getWageDataByDateRangeSchema = {
  name: 'getWageDataByDateRange',
  description: 'Get detailed wage data for a custom date range including shift duration, earnings breakdown, and totals.',
  parameters: {
    type: 'object',
    properties: {
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
    },
    required: ['from_date', 'to_date']
  }
};

const tools = [
  { type: 'function', function: addShiftSchema },
  { type: 'function', function: addSeriesSchema },
  { type: 'function', function: editShiftSchema },
  { type: 'function', function: deleteShiftSchema },
  { type: 'function', function: deleteSeriesSchema },
  { type: 'function', function: getShiftsSchema },
  { type: 'function', function: copyShiftSchema },
  { type: 'function', function: getWageDataByWeekSchema },
  { type: 'function', function: getWageDataByMonthSchema },
  { type: 'function', function: getWageDataByDateRangeSchema }
];

// Read-only tool allowlist for AI agent (no mutation tools)
const toolsReadOnly = [
  { type: 'function', function: getShiftsSchema },
  { type: 'function', function: getWageDataByWeekSchema },
  { type: 'function', function: getWageDataByMonthSchema },
  { type: 'function', function: getWageDataByDateRangeSchema }
];

function getToolsForRequest(req) {
  return isAiAgent(req) ? toolsReadOnly : tools;
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
  weekday: [
    { from: '18:00', to: '06:00', rate: 15.5 }
  ],
  saturday: [
    { from: '00:00', to: '24:00', rate: 15.5 }
  ],
  sunday: [
    { from: '00:00', to: '24:00', rate: 31.0 }
  ]
};

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

function calculateBonus(startTime, endTime, bonusSegments) {
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
    totalBonus += (overlap / 60) * segment.rate;
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
  const dayOfWeek = new Date(shift.shift_date).getDay();

  // Determine which bonus segments apply
  let applicableBonuses = [];
  if (dayOfWeek === 0) { // Sunday
    applicableBonuses = bonuses.sunday || [];
  } else if (dayOfWeek === 6) { // Saturday
    applicableBonuses = bonuses.saturday || [];
  } else { // Weekday
    applicableBonuses = bonuses.weekday || [];
  }

  // Create time segments with their applicable bonuses
  const timeSegments = [];

  // Start with the entire shift as base rate
  timeSegments.push({
    start: startMinutes,
    end: endMinutes,
    bonuses: []
  });

  // Apply each bonus to overlapping segments
  for (const bonus of applicableBonuses) {
    const bonusStart = timeToMinutes(bonus.from);
    let bonusEnd = timeToMinutes(bonus.to);
    if (bonusEnd <= bonusStart) {
      bonusEnd += 24 * 60;
    }

    const overlapStart = Math.max(startMinutes, bonusStart);
    const overlapEnd = Math.min(endMinutes, bonusEnd);

    if (overlapEnd > overlapStart) {
      // Split existing segments to accommodate this bonus
      const newSegments = [];

      for (const segment of timeSegments) {
        if (segment.end <= overlapStart || segment.start >= overlapEnd) {
          // No overlap - keep segment as is
          newSegments.push(segment);
        } else {
          // There's overlap - split the segment

          // Part before bonus (if any)
          if (segment.start < overlapStart) {
            newSegments.push({
              start: segment.start,
              end: overlapStart,
              bonuses: [...segment.bonuses]
            });
          }

          // Overlapping part with bonus added
          const overlapSegmentStart = Math.max(segment.start, overlapStart);
          const overlapSegmentEnd = Math.min(segment.end, overlapEnd);
          if (overlapSegmentEnd > overlapSegmentStart) {
            newSegments.push({
              start: overlapSegmentStart,
              end: overlapSegmentEnd,
              bonuses: [...segment.bonuses, bonus]
            });
          }

          // Part after bonus (if any)
          if (segment.end > overlapEnd) {
            newSegments.push({
              start: overlapEnd,
              end: segment.end,
              bonuses: [...segment.bonuses]
            });
          }
        }
      }

      timeSegments.length = 0;
      timeSegments.push(...newSegments);
    }
  }

  // Convert time segments to wage periods
  for (const segment of timeSegments) {
    const durationHours = (segment.end - segment.start) / 60;
    const totalBonusRate = segment.bonuses.reduce((sum, bonus) => sum + bonus.rate, 0);

    periods.push({
      startMinutes: segment.start,
      endMinutes: segment.end,
      durationHours: durationHours,
      wageRate: baseWageRate,
      bonusRate: totalBonusRate,
      totalRate: baseWageRate + totalBonusRate,
      type: totalBonusRate > 0 ? 'bonus' : 'base',
      bonuses: segment.bonuses
    });
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
  const bonuses = usePreset ? PRESET_BONUSES : (userSettings?.custom_bonuses || {
    weekday: [],
    saturday: [],
    sunday: []
  });

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

    const bonusType = shift.shift_type === 0 ? 'weekday' : (shift.shift_type === 1 ? 'saturday' : 'sunday');
    const bonusSegments = bonuses[bonusType] || [];

    // Calculate end time after adjustments
    const endHour = Math.floor(adjustedEndMinutes / 60) % 24;
    const endTimeStr = `${String(endHour).padStart(2,'0')}:${(adjustedEndMinutes % 60).toString().padStart(2,'0')}`;

    bonus = calculateBonus(shift.start_time, endTimeStr, bonusSegments);

    // Debug logging for traditional calculations
    if (durationHours > 5.5) {
      console.log('Traditional calculation (server):', {
        shiftId: shift.id,
        method: breakResult.method,
        originalHours: durationHours,
        paidHours: paidHours,
        baseWage: baseWage,
        bonus: bonus,
        total: baseWage + bonus
      });
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
      .from('subscription_tiers')
      .select('status, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    if (subError && subError.code !== 'PGRST116') {
      console.warn('[paywall] Could not fetch subscription:', subError);
      // If subscription_tiers table is not accessible, default to free tier rules
      console.warn('[paywall] Defaulting to free tier validation due to subscription query error');
    }

    const isActiveSubscription = subscription?.is_active === true;
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
    console.log(`[route] GET /settings authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'} body=${bodyPreview}`);
  } catch (_) {}
  try {
    const userId = req?.auth?.userId || req?.user_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabase
      .from('user_settings')
      .select('custom_wage, profile_picture_url, show_employee_tab')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // If column missing, degrade gracefully
      const msg = (error?.message || '').toString();
      const isMissingColumn = msg.includes('profile_picture_url') || msg.includes('show_employee_tab') || (error?.code === '42703');
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
      show_employee_tab: data?.show_employee_tab ?? true
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
    console.log(`[route] PUT /settings authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'} body=${bodyPreview}`);
  } catch (_) {}
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/settings', 'PUT', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const { custom_wage, profile_picture_url, show_employee_tab } = req.body || {};

    if (custom_wage !== undefined && custom_wage !== null && (typeof custom_wage !== 'number' || Number.isNaN(custom_wage))) {
      return res.status(400).json({ error: 'custom_wage must be a number' });
    }
    if (profile_picture_url !== undefined && profile_picture_url !== null && typeof profile_picture_url !== 'string') {
      return res.status(400).json({ error: 'profile_picture_url must be a string or null' });
    }
    if (show_employee_tab !== undefined && typeof show_employee_tab !== 'boolean') {
      return res.status(400).json({ error: 'show_employee_tab must be a boolean' });
    }

    const userId = req?.auth?.userId || req?.user_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const payload = { user_id: userId };
    if (custom_wage !== undefined) payload.custom_wage = custom_wage;
    if (profile_picture_url !== undefined) payload.profile_picture_url = profile_picture_url;
    if (show_employee_tab !== undefined) payload.show_employee_tab = show_employee_tab;

    let data = null; let error = null;
    try {
      const upsert = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select('custom_wage, profile_picture_url, show_employee_tab')
        .single();
      data = upsert.data; error = upsert.error;
    } catch (e) {
      error = e;
    }

    if (error) {
      const msg = (error?.message || '').toString();
      const isMissingColumn = msg.includes('profile_picture_url') || msg.includes('show_employee_tab') || (error?.code === '42703');
      if (isMissingColumn) {
        // Retry without profile_picture_url when column missing
        const retryPayload = { user_id: userId };
        if (custom_wage !== undefined) retryPayload.custom_wage = custom_wage;
        // Intentionally skip show_employee_tab if column missing
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
      show_employee_tab: data?.show_employee_tab ?? true
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

// Ephemeral chat sessions for GET-based streaming
const CHAT_SESSIONS = new Map(); // sid -> { user_id, messages, currentMonth, currentYear, createdAt }
const CHAT_SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

function gcChatSessions() {
  const now = Date.now();
  for (const [sid, sess] of CHAT_SESSIONS.entries()) {
    if (!sess || (now - (sess.createdAt || 0)) > CHAT_SESSION_TTL_MS) {
      CHAT_SESSIONS.delete(sid);
    }
  }
}

setInterval(gcChatSessions, 60 * 1000).unref?.();

// Preflight for chat session endpoints
app.options('/api/chat/start', cors(corsOptions));
app.options('/chat/start', cors(corsOptions));
app.options('/api/chat/stream', cors(corsOptions));
app.options('/chat/stream', cors(corsOptions));

// Start a chat session (POST) — stores messages so GET can stream reliably through CDNs
app.post('/chat/start', authenticateUser, async (req, res) => {
  try {
    const { messages, currentMonth, currentYear } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages required' });
    }
    const sid = randomUUID();
    CHAT_SESSIONS.set(sid, {
      user_id: req.user_id,
      messages,
      currentMonth: Number(currentMonth) || undefined,
      currentYear: Number(currentYear) || undefined,
      createdAt: Date.now()
    });
    res.json({ sid, ttl_ms: CHAT_SESSION_TTL_MS });
  } catch (e) {
    res.status(500).json({ error: 'failed_to_start_session' });
  }
});

// Stream a chat session (GET) — uses stored messages; responds with SSE
app.get('/chat/stream', authenticateUser, async (req, res) => {
  const sid = String(req.query.sid || '');
  const sess = CHAT_SESSIONS.get(sid);
  if (!sid || !sess) {
    return res.status(404).json({ error: 'session_not_found' });
  }
  if (sess.user_id !== req.user_id) {
    return res.status(403).json({ error: 'forbidden' });
  }

  // From here, behave like /chat with stream=true, but use sess payload
  const messages = Array.isArray(sess.messages) ? [...sess.messages] : [];
  // Inject auth context to suppress redundant re-auth prompts
  try {
    if (req && req.user_id) {
      messages.unshift({ role: 'system', content: 'ctx.isAuthenticated=true userId=' + req.user_id });
    }
  } catch (_) {}
  const stream = true;

  // Remove session to avoid reuse
  CHAT_SESSIONS.delete(sid);
  
  // The rest mirrors the SSE setup and agent loop from /chat
  // Removed inline time/month prompt context; SYSTEM_PROMPT is static now.

  const systemContextHint = { role: 'system', content: SYSTEM_PROMPT };

  const chatTools = getToolsForRequest(req);

  let heartbeat = null;
  const endStream = () => { if (heartbeat) clearInterval(heartbeat); res.end(); };

  // SSE headers (same as POST /chat)
  const origin = req.headers.origin || '*';
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Vary', 'Origin');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Content-Encoding', 'identity');
  res.setHeader('Keep-Alive', 'timeout=120');
  if (req.socket?.setKeepAlive) req.socket.setKeepAlive(true);
  if (req.socket?.setNoDelay) req.socket.setNoDelay(true);
  if (res.flushHeaders) res.flushHeaders();
  res.write(':' + ' '.repeat(8192) + '\n\n');
  res.write('event: ready\n');
  res.write('data: {"ok": true}\n\n');
  heartbeat = setInterval(() => res.write(':\n\n'), 10000);
  req.on('close', () => { clearInterval(heartbeat); });
  res.write(`data: ${JSON.stringify({ type: 'status', message: 'Tenker' })}\n\n`);

  const convo = [systemContextHint, ...messages];
  const startedAt = Date.now();
  let finalAssistantContent = null;
  let iter = 0;
  let done = false;

  try {
    while (!done && iter < MAX_ITERATIONS && (Date.now() - startedAt) < WALL_CLOCK_CAP_MS) {
      iter += 1;
      const t0 = Date.now();
      const sanitizedConvo = (function sanitizeMessagesForOpenAI(msgs) {
        try {
          return msgs.map(m => {
            if (m && m.role === 'assistant') {
              if (Array.isArray(m.tool_calls)) {
                if (m.tool_calls.length === 0) {
                  const { tool_calls, ...rest } = m; return rest;
                }
                return { ...m, content: m.content ?? null };
              }
            }
            return m;
          });
        } catch (_) { return msgs; }
      })(convo);
      const turn = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: sanitizedConvo,
        tools: chatTools,
        tool_choice: 'auto'
      });

      const msg = turn.choices?.[0]?.message || {};
      const toolCalls = msg.tool_calls || [];
      emitProgress(undefined, { phase: 'loop', iter, tool_calls: toolCalls.length || 0, latency_ms: Date.now() - t0, done: toolCalls.length === 0 });
      res.write(`data: ${JSON.stringify({ type: 'gpt_response', iteration: iter, content: msg.content || null, tool_calls: toolCalls.map(c => ({ name: c.function?.name })) })}\n\n`);

      if (toolCalls.length > 0) {
        convo.push({ role: 'assistant', content: null, tool_calls: toolCalls });
      } else {
        convo.push({ role: 'assistant', content: msg.content || '' });
      }

      if (toolCalls.length === 0) {
        finalAssistantContent = msg.content || '';
        done = true;
        break;
      }

      res.write(`data: ${JSON.stringify({ type: 'tool_calls_start', iteration: iter, count: toolCalls.length })}\n\n`);
      const results = await Promise.allSettled(toolCalls.map(call => runToolWithTimeout(call, req.user_id, iter, res)));
      results.forEach((settled, idx) => {
        const call = toolCalls[idx];
        let content = '';
        if (settled.status === 'fulfilled') { content = settled.value?.content ?? ''; }
        else { content = JSON.stringify({ error: settled.reason?.message || 'tool_failed' }); }
        convo.push({ role: 'tool', tool_call_id: call.id, name: call?.function?.name, content });
      });
    }

    if (!done && finalAssistantContent == null) {
      finalAssistantContent = 'Beklager, jeg måtte stoppe før jeg ble ferdig. Prøv igjen.';
    }

    // Final text streaming
    const sanitizedConvoFinal = (function sanitizeMessagesForOpenAI(msgs) {
      try {
        return msgs.map(m => {
          if (m && m.role === 'assistant') {
            if (Array.isArray(m.tool_calls)) {
              if (m.tool_calls.length === 0) { const { tool_calls, ...rest } = m; return rest; }
              return { ...m, content: m.content ?? null };
            }
          }
          return m;
        });
      } catch (_) { return msgs; }
    })(convo);
    // Start shifts query early to reduce end latency
    const shiftsPromise = supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', req.user_id)
      .order('shift_date');

    const streamCompletion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: sanitizedConvoFinal,
      tools: chatTools,
      tool_choice: 'none',
      stream: true,
      // Optimize for faster first token
      temperature: 0.7,
      max_tokens: 4096
    });
    
    res.write(`data: ${JSON.stringify({ type: 'text_stream_start' })}\n\n`);
    let assistantMessage = '';
    
    for await (const chunk of streamCompletion) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        assistantMessage += content;
        // Write immediately without buffering
        res.write(`data: ${JSON.stringify({ type: 'text_chunk', content })}\n\n`);
        // Force flush for minimal latency
        if (res.flush) res.flush();
      }
    }

    // Wait for shifts query that was started earlier
    const { data: shifts } = await shiftsPromise;

    res.write(`data: ${JSON.stringify({ type: 'text_stream_end' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'shifts_update', shifts: shifts || [] })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'complete', assistant: assistantMessage, shifts: shifts || [] })}\n\n`);
    res.write('data: [DONE]\n\n');
    endStream();
  } catch (e) {
    try { res.write(`data: ${JSON.stringify({ type: 'error', message: 'stream_failed' })}\n\n`); } catch (_) {}
    endStream();
  }
});

// ---------- /chat (POST streaming or JSON) ----------
app.post('/chat', authenticateUser, async (req, res) => {
  const { stream = false } = req.body;

  if (!openai) {
    return res.status(503).json({ error: 'OpenAI not configured' });
  }

  // Removed inline time/month prompt context; SYSTEM_PROMPT is static now.

  const systemContextHint = { role: 'system', content: SYSTEM_PROMPT };

  // Tool allowlist based on ai_agent claim
  const chatTools = getToolsForRequest(req);

  // Extract and inject auth context into model input
  const rawMessages = Array.isArray(req.body?.messages) ? [...req.body.messages] : [];
  try {
    if (req && req.user_id) {
      rawMessages.unshift({ role: 'system', content: 'ctx.isAuthenticated=true userId=' + req.user_id });
    }
  } catch (_) {}
  const messages = rawMessages;

  // SSE setup with keepalive
  let heartbeat = null;
  const endStream = () => {
    if (heartbeat) clearInterval(heartbeat);
    res.end();
  };

  if (stream) {
    const origin = req.headers.origin || '*';
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    // Echo Origin for credentialed requests (Authorization header); avoid wildcard for Safari
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    // Hint to proxies/CDNs to avoid buffering
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Content-Encoding', 'identity');
    res.setHeader('Keep-Alive', 'timeout=120');
    
    if (req.socket?.setKeepAlive) req.socket.setKeepAlive(true);
    if (req.socket?.setNoDelay) req.socket.setNoDelay(true);
    if (res.flushHeaders) res.flushHeaders();
    
    // ~8KB primer to force intermediaries to open the pipe
    res.write(':' + ' '.repeat(8192) + '\n\n');
    
    // Let client know we're live before heavy work
    res.write('event: ready\n');
    res.write('data: {"ok": true}\n\n');
    
    // Setup heartbeat every 10s
    heartbeat = setInterval(() => res.write(':\n\n'), 10000);
    req.on('close', () => { clearInterval(heartbeat); });
    
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Tenker' })}\n\n`);
  }

  // Maintain a single messages array for the agent loop
  const convo = [systemContextHint, ...messages];
  const startedAt = Date.now();

  let finalAssistantContent = null;
  let iter = 0;
  let done = false;

  while (!done && iter < MAX_ITERATIONS && (Date.now() - startedAt) < WALL_CLOCK_CAP_MS) {
    iter += 1;
    const t0 = Date.now();
    // Sanitize conversation to avoid sending assistant messages with tool_calls: []
    const sanitizedConvo = (function sanitizeMessagesForOpenAI(msgs) {
      try {
        return msgs.map(m => {
          if (m && m.role === 'assistant') {
            if (Array.isArray(m.tool_calls)) {
              if (m.tool_calls.length === 0) {
                const { tool_calls, ...rest } = m;
                return rest;
              }
              // Ensure content is null when tool_calls exist
              return { ...m, content: m.content ?? null };
            }
          }
          return m;
        });
      } catch (_) {
        return msgs;
      }
    })(convo);
    
    // One model turn - with streaming for reasoning phase
    let msg, toolCalls;
    if (stream) {
      // Stream the reasoning phase for better UX
      const streamedTurn = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: sanitizedConvo,
        tools: chatTools,
        tool_choice: 'auto',
        stream: true
      });

      // Send reasoning stream start event
      const reasoningStartTime = Date.now();
      res.write(`data: ${JSON.stringify({ type: 'reasoning_start', iteration: iter, timestamp: reasoningStartTime })}\n\n`);

      let accumulatedContent = '';
      let accumulatedToolCalls = [];
      
      for await (const chunk of streamedTurn) {
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        // Stream reasoning content if present
        if (delta.content) {
            accumulatedContent += delta.content;
          res.write(`data: ${JSON.stringify({ type: 'reasoning_chunk', content: delta.content, iteration: iter })}\n\n`);
        }

        // Collect tool calls with proper index handling
        if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
          delta.tool_calls.forEach((toolCall) => {
            const toolIndex = toolCall.index;
            if (toolIndex === undefined) return;
            
            // Initialize tool call object if it doesn't exist
            if (!accumulatedToolCalls[toolIndex]) {
              accumulatedToolCalls[toolIndex] = { 
                id: '', 
                type: 'function', 
                function: { name: '', arguments: '' } 
              };
            }
            
            // Update tool call properties
            if (toolCall.id) accumulatedToolCalls[toolIndex].id = toolCall.id;
            if (toolCall.type) accumulatedToolCalls[toolIndex].type = toolCall.type;
            if (toolCall.function?.name) {
              accumulatedToolCalls[toolIndex].function.name = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              accumulatedToolCalls[toolIndex].function.arguments += toolCall.function.arguments;
            }
          });
        }
      }
      

      // Send reasoning end event
      if (accumulatedContent) {
        res.write(`data: ${JSON.stringify({ type: 'reasoning_end', iteration: iter, timestamp: Date.now() })}\n\n`);
      }

      // Filter out empty tool calls and ensure they have valid IDs
      const validToolCalls = accumulatedToolCalls.filter(call => call && call.id && call.function?.name);
      
      msg = { 
        content: accumulatedContent || null, 
        tool_calls: validToolCalls.length > 0 ? validToolCalls : undefined 
      };
      toolCalls = msg.tool_calls || [];
    } else {
      // Non-streaming fallback
      const turn = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: sanitizedConvo,
        tools: chatTools,
        tool_choice: 'auto'
      });

      msg = turn.choices?.[0]?.message || {};
      toolCalls = msg.tool_calls || [];
    }

    // Structured loop log + WS progress
    emitProgress(req?._ws_for_progress, { phase: 'loop', iter, tool_calls: toolCalls.length || 0, latency_ms: Date.now() - t0, done: toolCalls.length === 0 });

    // Reflect assistant decision on stream (no payloads)
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'gpt_response', iteration: iter, content: msg.content || null, tool_calls: toolCalls.map(c => ({ name: c.function?.name })) })}\n\n`);
    }

    // Append assistant turn to history
    if (toolCalls.length > 0) {
      // Assistant decided to call tools: include tool_calls and set content to null
      convo.push({ role: 'assistant', content: null, tool_calls: toolCalls });
    } else {
      // No tools: push a plain assistant message without tool_calls
      convo.push({ role: 'assistant', content: msg.content || '' });
    }

    if (toolCalls.length === 0) {
      // No tools requested → finish loop
      finalAssistantContent = msg.content || '';
      done = true;
      // If running over WebSocket, emit a summary of this turn
      try {
        if (req && req._ws_for_progress && Array.isArray(req._ws_for_progress._trace)) {
          const ws = req._ws_for_progress;
          const total_iters = iter;
          const total_tools = ws._trace.filter(e => e.phase === 'tool').length;
          const duration_ms = Date.now() - startedAt;
          const tools = ws._trace
            .filter(e => e.phase === 'tool')
            .map(({ name, duration_ms }) => ({ name, duration_ms }));
          ws.send(JSON.stringify({
            type: 'progress_summary',
            ts: Date.now(),
            total_iters,
            total_tools,
            duration_ms,
            tools
          }));
          // Clear trace to avoid growth across turns
          ws._trace = [];
          ws._trace_idx = 0;
        }
      } catch (_) {}
      break;
    }

    // Run multiple tool calls in parallel with timeout
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: 'tool_calls_start', iteration: iter, count: toolCalls.length })}\n\n`);
    }

    const results = await Promise.allSettled(
      toolCalls.map(call => runToolWithTimeout(call, req.user_id, iter, stream ? res : null))
    );

    // Append tool messages to history in the same order
    results.forEach((settled, idx) => {
      const call = toolCalls[idx];
      let content = '';
      if (settled.status === 'fulfilled') {
        content = settled.value?.content ?? '';
      } else {
        content = JSON.stringify({ error: settled.reason?.message || 'tool_failed' });
      }
      convo.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call?.function?.name,
        content
      });
    });

    // Iteration continues; model will see tool results next turn
  }

  // If we exited due to cap/timeout without final content, synthesize brief note
  if (!done && finalAssistantContent == null) {
    finalAssistantContent = 'Beklager, jeg måtte stoppe før jeg ble ferdig. Prøv igjen.';
  }

  // Final assistant response: stream tokens as today using a separate call with tool_choice='none'
  let assistantMessage = '';
  try {
    if (stream) {
      const sanitizedConvoFinal = (function sanitizeMessagesForOpenAI(msgs) {
        try {
          return msgs.map(m => {
            if (m && m.role === 'assistant') {
              if (Array.isArray(m.tool_calls)) {
                if (m.tool_calls.length === 0) {
                  const { tool_calls, ...rest } = m;
                  return rest;
                }
                return { ...m, content: m.content ?? null };
              }
            }
            return m;
          });
        } catch (_) {
          return msgs;
        }
      })(convo);
      const streamCompletion = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: sanitizedConvoFinal,
        tools: chatTools,
        tool_choice: 'none',
        stream: true
      });

      res.write(`data: ${JSON.stringify({ type: 'text_stream_start' })}\n\n`);
      for await (const chunk of streamCompletion) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) {
          assistantMessage += content;
          res.write(`data: ${JSON.stringify({ type: 'text_chunk', content })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ type: 'text_stream_end' })}\n\n`);
    } else {
      const sanitizedConvoFinal = (function sanitizeMessagesForOpenAI(msgs) {
        try {
          return msgs.map(m => {
            if (m && m.role === 'assistant') {
              if (Array.isArray(m.tool_calls)) {
                if (m.tool_calls.length === 0) {
                  const { tool_calls, ...rest } = m;
                  return rest;
                }
                return { ...m, content: m.content ?? null };
              }
            }
            return m;
          });
        } catch (_) {
          return msgs;
        }
      })(convo);
      const secondCompletion = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: sanitizedConvoFinal,
        tools: chatTools,
        tool_choice: 'none'
      });
      assistantMessage = secondCompletion.choices?.[0]?.message?.content || finalAssistantContent || '';
    }
  } catch (error) {
    console.error('Final GPT call failed:', error);
    assistantMessage = finalAssistantContent || 'Det oppstod en feil. Prøv igjen litt senere.';
  }

  // Append a fresh view of shifts for UI convenience (unchanged contract)
  const { data: shifts } = await supabase
    .from('user_shifts')
    .select('*')
    .eq('user_id', req.user_id)
    .order('shift_date');

  if (stream) {
    res.write(`data: ${JSON.stringify({ type: 'shifts_update', shifts: shifts || [] })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'complete', assistant: assistantMessage, shifts: shifts || [] })}\n\n`);
    res.write('data: [DONE]\n\n');
    endStream();
  } else {
    res.json({ assistant: assistantMessage, shifts: shifts || [] });
  }
});

// ---------- user avatar upload ----------
// Stores user avatars in Supabase Storage (bucket: user-avatars) using service role
app.post('/user/avatar', authenticateUser, async (req, res) => {
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/user/avatar', 'POST', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const { image_base64 } = req.body || {};
    if (!image_base64 || typeof image_base64 !== 'string') {
      return res.status(400).json({ error: 'image_base64 required' });
    }

    // Ensure bucket exists (idempotent) - align with existing bucket name convention
    try {
      await supabase.storage.createBucket('profile-pictures', { public: true });
    } catch (_) {
      // ignore if exists
    }

    const buffer = Buffer.from(image_base64, 'base64');
    const userId = req.user_id;
    const filePath = `${userId}/profile_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, buffer, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }

    const { data: publicData } = supabase.storage.from('profile-pictures').getPublicUrl(filePath);
    const url = publicData?.publicUrl;
    if (!url) {
      return res.status(500).json({ error: 'Failed to get public URL' });
    }

    return res.json({ url });
  } catch (e) {
    console.error('POST /user/avatar error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Helper: detect missing column errors for graceful fallback
function isTariffColumnError(err) {
  try {
    const s = [err?.message, err?.details, err?.hint, err?.code].filter(Boolean).join(' | ');
    return s.includes('tariff_level') || s.includes('42703');
  } catch { return false; }
}


// Normalize employee names so each word starts with an uppercase letter
// Handles spaces, hyphens and apostrophes (e.g., "anne-marie o'neill" -> "Anne-Marie O'Neill")
function normalizeEmployeeName(rawName) {
  try {
    const input = (rawName || '').toString().trim().replace(/\s+/g, ' ');
    if (!input) return '';

    const cap = (s) => (s && s.length > 0)
      ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
      : '';

    return input
      .split(' ') // words by spaces
      .map(word => word
        .split('-') // handle hyphenated names
        .map(part => part
          .split("'") // handle apostrophes
          .map(cap)
          .join("'"))
        .join('-'))
      .join(' ');
  } catch (_) {
    return (rawName || '').toString().trim();
  }
}


// ---------- employee CRUD endpoints ----------

/**
 * GET /employees - List all employees for the authenticated manager
 * Query params: ?include_archived=1 to include archived employees
 */
app.get('/employees', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    const bodyPreview = (() => { try { return JSON.stringify(req.body || {}); } catch (_) { return '[unserializable]'; }})();
    console.log(`[route] GET /employees authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'} body=${bodyPreview}`);
  } catch (_) {}
  try {
    const managerId = req?.auth?.userId || req?.user_id;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });
    const includeArchived = req.query.include_archived === '1';

    let query = supabase
      .from('employees')
      .select('id, name, email, hourly_wage, tariff_level, birth_date, display_color, created_at, archived_at')
      .eq('manager_id', managerId)
      .order('name');

    // By default, exclude archived employees
    if (!includeArchived) {
      query = query.is('archived_at', null);
    }

    const { data: employees, error } = await query;

    if (error) {
      const msg = (error?.message || '').toString();
      console.error('Error fetching employees:', msg, error?.stack || '');
      return res.status(500).json({ error: msg, code: error?.code || null, stack: error?.stack || null });
    }

    const normalized = (employees || []).map(emp => ({
      ...emp,
      name: normalizeEmployeeName(emp?.name)
    }));

    res.json({ employees: normalized });
  } catch (e) {
    console.error('GET /employees error:', e?.message || e, e?.stack || '');
    res.status(500).json({ error: e?.message || String(e), stack: e?.stack || null });
  }
});

/**
 * POST /employees - Create a new employee
 * Body: { name, email?, hourly_wage?, tariff_level?, birth_date?, display_color? }
 */
app.post('/employees', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    const bodyPreview = (() => { try { return JSON.stringify(req.body || {}); } catch (_) { return '[unserializable]'; }})();
    console.log(`[route] POST /employees authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'} body=${bodyPreview}`);
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
    console.log(`[route] PUT /employees/:id authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'} body=${bodyPreview}`);
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
    console.log(`[route] DELETE /employees/:id authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'} body=${bodyPreview}`);
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

// Avatar endpoints removed

// ---------- shift CRUD endpoints ----------

/**
 * GET /shifts - List shifts for the authenticated manager
 * Note: employee_id filtering deprecated. Use /employee-shifts for employee-scoped queries.
 * Query params:
 *   ?from=YYYY-MM-DD - Start date filter
 *   ?to=YYYY-MM-DD - End date filter
 */
app.get('/shifts', authenticateUser, async (req, res) => {
  try {
    const managerId = req.user_id;
    const { from, to } = req.query;

    // Build query
    let query = supabase
      .from('user_shifts')
      .select('id, shift_date, start_time, end_time, shift_type, created_at')
      .eq('user_id', managerId)
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Apply filters
    if (from) query = query.gte('shift_date', from);
    if (to) query = query.lte('shift_date', to);

    const { data: shifts, error: shiftsError } = await query;

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError);
      return res.status(500).json({ error: 'Failed to fetch shifts' });
    }

    return res.json({ shifts });
  } catch (error) {
    console.error('GET /shifts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /shifts - Create a new shift
 * Body: { shift_date, start_time, end_time }
 */
app.post('/shifts', authenticateUser, async (req, res) => {
  try {
    const managerId = req.user_id;
    const { shift_date, start_time, end_time } = req.body;

    // Validation
    if (!shift_date || !start_time || !end_time) {
      return res.status(400).json({
        error: 'Missing required fields: shift_date, start_time, end_time'
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shift_date)) {
      return res.status(400).json({ error: 'Invalid shift_date format. Use YYYY-MM-DD' });
    }

    // Validate time format
    if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:mm' });
    }

    // Employee assignment moved to employee_shifts; ignore any employee_id in request
    let employeeContext = null;

    // Check for duplicate shift
    const { data: existingShift } = await supabase
      .from('user_shifts')
      .select('id')
      .eq('user_id', managerId)
      .eq('shift_date', shift_date)
      .eq('start_time', start_time)
      .eq('end_time', end_time)
      .maybeSingle();

    if (existingShift) {
      return res.status(409).json({ error: 'Shift already exists' });
    }

    // Determine shift type based on day of week
    const shiftDate = new Date(shift_date + 'T00:00:00Z');
    const dayOfWeek = shiftDate.getDay();
    const shift_type = dayOfWeek === 0 ? 2 : (dayOfWeek === 6 ? 1 : 0); // Sunday=2, Saturday=1, Weekday=0

    // Create shift
    const { data: newShift, error: insertError } = await supabase
      .from('user_shifts')
      .insert({
        user_id: managerId,
        shift_date,
        start_time,
        end_time,
        shift_type
      })
      .select('id, shift_date, start_time, end_time, shift_type, created_at')
      .single();

    if (insertError) {
      console.error('Error creating shift:', insertError);
      return res.status(500).json({ error: 'Failed to create shift' });
    }

    // Add employee context to response
    const shiftWithContext = {
      ...newShift,
      employee: employeeContext
    };

    return res.status(201).json({ shift: shiftWithContext });
  } catch (error) {
    console.error('POST /shifts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /shifts/:id - Update an existing shift
 * Body: { shift_date?, start_time?, end_time? }
 */
app.put('/shifts/:id', authenticateUser, async (req, res) => {
  try {
    const managerId = req.user_id;
    const shiftId = req.params.id;
    const { shift_date, start_time, end_time } = req.body;

    // Verify the shift belongs to the current manager
    const { data: existingShift, error: fetchError } = await supabase
      .from('user_shifts')
      .select('*')
      .eq('id', shiftId)
      .eq('user_id', managerId)
      .single();

    if (fetchError || !existingShift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Employee assignment moved to employee_shifts; ignore any employee_id in request
    let employeeContext = null;

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

    // Build update object
    const updateData = {};
    if (shift_date !== undefined) updateData.shift_date = shift_date;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;

    // Update shift_type if date is changing
    if (shift_date) {
      const shiftDate = new Date(shift_date + 'T00:00:00Z');
      const dayOfWeek = shiftDate.getDay();
      updateData.shift_type = dayOfWeek === 0 ? 2 : (dayOfWeek === 6 ? 1 : 0);

    }

    // Check for duplicate if key fields are changing
    const finalDate = shift_date || existingShift.shift_date;
    const finalStartTime = start_time || existingShift.start_time;
    const finalEndTime = end_time || existingShift.end_time;

    if (shift_date || start_time || end_time) {
      const { data: duplicateShift } = await supabase
        .from('user_shifts')
        .select('id')
        .eq('user_id', managerId)
        .eq('shift_date', finalDate)
        .eq('start_time', finalStartTime)
        .eq('end_time', finalEndTime)
        .neq('id', shiftId)
        .maybeSingle();

      if (duplicateShift) {
        return res.status(409).json({ error: 'A shift with these details already exists' });
      }
    }

    // Update the shift
    const { data: updatedShift, error: updateError } = await supabase
      .from('user_shifts')
      .update(updateData)
      .eq('id', shiftId)
      .eq('user_id', managerId)
      .select('id, shift_date, start_time, end_time, shift_type, employee_id, created_at')
      .single();

    if (updateError) {
      console.error('Error updating shift:', updateError);
      return res.status(500).json({ error: 'Failed to update shift' });
    }

    // Add employee context to response
    const shiftWithContext = {
      ...updatedShift,
      employee: employeeContext
    };

    return res.json({ shift: shiftWithContext });
  } catch (error) {
    console.error('PUT /shifts/:id error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /shifts/:id - Delete a shift
 */
app.delete('/shifts/:id', authenticateUser, async (req, res) => {
  try {
    const managerId = req.user_id;
    const shiftId = req.params.id;

    // Verify the shift belongs to the current manager
    const { data: existingShift, error: fetchError } = await supabase
      .from('user_shifts')
      .select('id, shift_date, start_time, end_time')
      .eq('id', shiftId)
      .eq('user_id', managerId)
      .single();

    if (fetchError || !existingShift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Delete the shift
    const { error: deleteError } = await supabase
      .from('user_shifts')
      .delete()
      .eq('id', shiftId)
      .eq('user_id', managerId);

    if (deleteError) {
      console.error('Error deleting shift:', deleteError);
      return res.status(500).json({ error: 'Failed to delete shift' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('DELETE /shifts/:id error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /shifts/outside-month/:month - Delete all shifts outside specified month (for free tier)
 */
app.delete('/shifts/outside-month/:month', authenticateUser, async (req, res) => {
  try {
    const userId = req.user_id;
    const monthParam = req.params.month; // Expected format: YYYY-MM

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(monthParam)) {
      return res.status(400).json({ error: 'Invalid month format. Expected YYYY-MM' });
    }

    // First, fetch all shifts for the user to find ones to delete
    const { data: allShifts, error: fetchError } = await supabase
      .from('user_shifts')
      .select('id, shift_date')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching shifts for deletion:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch shifts' });
    }

    if (!allShifts || allShifts.length === 0) {
      return res.status(200).json({
        success: true,
        deletedCount: 0,
        message: 'No shifts found to delete'
      });
    }

    // Filter shifts that are NOT in the target month
    const shiftsToDelete = allShifts.filter(shift => {
      const shiftMonth = shift.shift_date.substring(0, 7); // Extract YYYY-MM
      return shiftMonth !== monthParam;
    });

    if (shiftsToDelete.length === 0) {
      return res.status(200).json({
        success: true,
        deletedCount: 0,
        message: `No shifts outside ${monthParam} found`
      });
    }

    // Delete the filtered shifts by their IDs
    const idsToDelete = shiftsToDelete.map(shift => shift.id);
    const { data, error } = await supabase
      .from('user_shifts')
      .delete()
      .eq('user_id', userId)
      .in('id', idsToDelete)
      .select('id');

    if (error) {
      console.error('Error deleting shifts outside month:', error);
      return res.status(500).json({ error: 'Failed to delete shifts' });
    }

    return res.status(200).json({
      success: true,
      deletedCount: data ? data.length : 0,
      message: `Deleted ${data ? data.length : 0} shifts outside ${monthParam}`
    });
  } catch (error) {
    console.error('DELETE /shifts/outside-month/:month error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

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

    // Validate formats
    if (!/^\d{4}-\d{2}-\d{2}$/.test(shift_date)) {
      return res.status(400).json({ error: 'Invalid shift_date format. Use YYYY-MM-DD' });
    }
    if (!/^\d{2}:\d{2}$/.test(start_time) || !/^\d{2}:\d{2}$/.test(end_time)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:mm' });
    }
    const breakMins = parseInt(break_minutes);
    if (Number.isNaN(breakMins) || breakMins < 0) {
      return res.status(400).json({ error: 'break_minutes must be a non-negative integer' });
    }

    // Compute snapshots from server-side employee row
    const snap = await computeEmployeeSnapshot(managerId, employee_id);
    if (!snap.ok) return res.status(snap.statusCode || 400).json({ error: snap.error });

    const { data: inserted, error } = await supabase
      .from('employee_shifts')
      .insert({
        manager_id: managerId,
        employee_id,
        employee_name_snapshot: snap.snapshot.employee_name_snapshot,
        tariff_level_snapshot: snap.snapshot.tariff_level_snapshot,
        hourly_wage_snapshot: snap.snapshot.hourly_wage_snapshot,
        shift_date,
        start_time: hhmmToUtcIso(shift_date, start_time),
        end_time: hhmmToUtcIso(shift_date, end_time),
        break_minutes: breakMins,
        notes: notes ?? null
      })
      .select('id, employee_id, employee_name_snapshot, tariff_level_snapshot, hourly_wage_snapshot, shift_date, start_time, end_time, break_minutes, notes, created_at, updated_at')
      .single();

    if (error) {
      console.error('POST /employee-shifts insert error:', error);
      return res.status(500).json({ error: 'Failed to create employee shift' });
    }

    const resp = {
      ...inserted,
      hourly_wage_snapshot: Number(inserted.hourly_wage_snapshot),
      start_time: formatTimeHHmm(inserted.start_time),
      end_time: formatTimeHHmm(inserted.end_time)
    };
    return res.status(201).json({ shift: resp });
  } catch (e) {
    console.error('POST /employee-shifts exception:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

 /**
  * PUT /employee-shifts/:id
  * Body: { employee_id?, shift_date?, start_time?, end_time?, break_minutes?, notes? }
  */
 app.put('/employee-shifts/:id', authenticateUser, async (req, res) => {
   try {
     if (isAiAgent(req)) {
       recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
       incrementAgentWriteDenied('/employee-shifts', 'PUT', 'agent_write_blocked_middleware');
       return res.status(403).json({ error: 'Agent writes are not allowed' });
     }

     const managerId = req.user_id;
     const id = req.params.id;
     const { employee_id, shift_date, start_time, end_time, break_minutes, notes } = req.body || {};

     // Fetch existing row and assert ownership
     const { data: existing, error: fetchErr } = await supabase
       .from('employee_shifts')
       .select('*')
       .eq('id', id)
       .eq('manager_id', managerId)
       .single();
     if (fetchErr || !existing) return res.status(404).json({ error: 'Shift not found' });

     // Validate formats if provided
     if (shift_date && !/^\d{4}-\d{2}-\d{2}$/.test(shift_date)) {
       return res.status(400).json({ error: 'Invalid shift_date format. Use YYYY-MM-DD' });
     }
     if ((start_time && !/^\d{2}:\d{2}$/.test(start_time)) || (end_time && !/^\d{2}:\d{2}$/.test(end_time))) {
       return res.status(400).json({ error: 'Invalid time format. Use HH:mm' });
     }
     if (break_minutes !== undefined) {
       const bm = parseInt(break_minutes);
       if (Number.isNaN(bm) || bm < 0) return res.status(400).json({ error: 'break_minutes must be a non-negative integer' });
     }

     // Determine final employee and recompute snapshot
     const finalEmployeeId = employee_id !== undefined ? employee_id : existing.employee_id;
     const snap = await computeEmployeeSnapshot(managerId, finalEmployeeId);
     if (!snap.ok) return res.status(snap.statusCode || 400).json({ error: snap.error });

     // Determine final date/times
     const finalDate = shift_date || existing.shift_date;
     const existingStartHHmm = formatTimeHHmm(existing.start_time);
     const existingEndHHmm = formatTimeHHmm(existing.end_time);
     const finalStartHHmm = start_time || existingStartHHmm;
     const finalEndHHmm = end_time || existingEndHHmm;

     const updateData = {
       employee_id: finalEmployeeId,
       employee_name_snapshot: snap.snapshot.employee_name_snapshot,
       tariff_level_snapshot: snap.snapshot.tariff_level_snapshot,
       hourly_wage_snapshot: snap.snapshot.hourly_wage_snapshot
     };
     if (shift_date) updateData.shift_date = finalDate;
     if (shift_date || start_time) updateData.start_time = hhmmToUtcIso(finalDate, finalStartHHmm);
     if (shift_date || end_time) updateData.end_time = hhmmToUtcIso(finalDate, finalEndHHmm);
     if (break_minutes !== undefined) updateData.break_minutes = parseInt(break_minutes);
     if (notes !== undefined) updateData.notes = notes ?? null;

     const { data: updated, error: updErr } = await supabase
       .from('employee_shifts')
       .update(updateData)
       .eq('id', id)
       .eq('manager_id', managerId)
       .select('id, employee_id, employee_name_snapshot, tariff_level_snapshot, hourly_wage_snapshot, shift_date, start_time, end_time, break_minutes, notes, created_at, updated_at')
       .single();

     if (updErr) {
       console.error('PUT /employee-shifts update error:', updErr);
       return res.status(500).json({ error: 'Failed to update employee shift' });
     }

     const resp = {
       ...updated,
       hourly_wage_snapshot: Number(updated.hourly_wage_snapshot),
       start_time: formatTimeHHmm(updated.start_time),
       end_time: formatTimeHHmm(updated.end_time)
     };
     return res.json({ shift: resp });
   } catch (e) {
     console.error('PUT /employee-shifts exception:', e);
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
     const id = req.params.id;

     // Ensure row belongs to manager
     const { data: existing, error: fetchErr } = await supabase
       .from('employee_shifts')
       .select('id')
       .eq('id', id)
       .eq('manager_id', managerId)
       .single();
     if (fetchErr || !existing) return res.status(404).json({ error: 'Shift not found' });

     const { error } = await supabase
       .from('employee_shifts')
       .delete()
       .eq('id', id)
       .eq('manager_id', managerId);

     if (error) {
       console.error('DELETE /employee-shifts error:', error);
       return res.status(500).json({ error: 'Failed to delete employee shift' });
     }

     return res.status(204).send();
   } catch (e) {
     console.error('DELETE /employee-shifts exception:', e);
     return res.status(500).json({ error: 'Internal server error' });
   }
 });

// ---------- wage reports endpoints ----------

/**
 * GET /reports/wages
 * Export employee wages as CSV with streaming support
 * Query params: from?, to?, employee_id?
 */
app.get('/reports/wages', authenticateUser, async (req, res) => {
  try {
    // Block AI agent access
    if (isAiAgent(req)) {
      return res.status(403).json({ error: 'Agent access not allowed' });
    }

    const managerId = req.user_id;
    const { from, to, employee_id } = req.query;

    // Validate employee ownership if employee_id provided
    if (employee_id) {
      const { data: emp, error } = await supabase
        .from('employees')
        .select('id, manager_id')
        .eq('id', employee_id)
        .single();

      if (error || !emp || emp.manager_id !== managerId) {
        return res.status(403).json({ error: 'Employee not found or access denied' });
      }
    }

    // Build query with manager ownership filter
    let query = supabase
      .from('employee_shifts')
      .select('*')
      .eq('manager_id', managerId)
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Apply filters
    if (employee_id) query = query.eq('employee_id', employee_id);
    if (from) query = query.gte('shift_date', from);
    if (to) query = query.lte('shift_date', to);

    // Execute query
    const { data: shifts, error } = await query;
    if (error) {
      console.error('GET /reports/wages query error:', error);
      return res.status(500).json({ error: 'Failed to fetch wage data' });
    }

    // Get org settings for break policy
    const orgSettings = await getOrgSettings(managerId);

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="wage_report_${new Date().toISOString().split('T')[0]}.csv"`);

    // Write CSV header row
    res.write('employee_name,shift_date,start_time,end_time,duration_hours,break_minutes,break_policy_used,paid_hours,tariff_level_snapshot,hourly_wage_snapshot,gross_wage\n');

    // Process and stream each shift
    for (const shift of shifts || []) {
      const startHHmm = formatTimeHHmm(shift.start_time);
      const endHHmm = formatTimeHHmm(shift.end_time);

      // Calculate wages using existing function
      const calc = calcEmployeeShift({
        start_time: startHHmm,
        end_time: endHHmm,
        break_minutes: shift.break_minutes || 0,
        hourly_wage_snapshot: Number(shift.hourly_wage_snapshot)
      }, orgSettings);

      // Format CSV row
      const rawName = (shift.employee_name_snapshot || '').replace(/"/g, '""');
      const safeName = /^[=+\-@]/.test(rawName) ? "'" + rawName : rawName;
      const csvRow = [
        `"${safeName}"`,
        shift.shift_date,
        startHHmm,
        endHHmm,
        calc.durationHours.toFixed(2),
        shift.break_minutes || 0,
        calc.breakPolicyUsed,
        calc.paidHours.toFixed(2),
        shift.tariff_level_snapshot || '',
        Number(shift.hourly_wage_snapshot).toFixed(2),
        calc.gross.toFixed(2)
      ].join(',');

      res.write(csvRow + '\n');
    }

    // End response
    res.end();

    console.log(`[CSV Export] Manager ${managerId} exported ${shifts?.length || 0} shifts`);
  } catch (e) {
    console.error('GET /reports/wages exception:', e);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ---------- handleTool function (legacy duplicate; renamed to avoid redeclare) ----------
async function handleTool(call, user_id) {
  const fnName = call.function.name;
  const args = JSON.parse(call.function.arguments);
  let toolResult = '';

  if (fnName === 'addShift') {
      // Validate subscription and paywall rules
      const paywallValidation = await validateShiftCreation(user_id, args.shift_date);
      if (!paywallValidation.valid) {
        toolResult = JSON.stringify({
          status: 'paywall_blocked',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: paywallValidation.error === 'premium_feature_required'
            ? 'Du har funnet en premium-funksjon. Oppgrader til et abonnement eller slett alle vakter i de andre månedene.'
            : 'Kunne ikke opprette vakt.',
          requiresUpgrade: paywallValidation.requiresUpgrade,
          otherMonths: paywallValidation.otherMonths
        });
        return toolResult;
      }

      // Check for duplicate shift before inserting
      const { data: dupCheck } = await supabase
        .from('user_shifts')
        .select('id')
        .eq('user_id', user_id)
        .eq('shift_date', args.shift_date)
        .eq('start_time', args.start_time)
        .eq('end_time', args.end_time)
        .maybeSingle();

      if (dupCheck) {
        toolResult = JSON.stringify({
          status: 'duplicate',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Skiftet eksisterer allerede'
        });
      } else {
        const { data: insertedShift, error } = await supabase
          .from('user_shifts')
          .insert({
            user_id:     user_id,
            shift_date:  args.shift_date,
            start_time:  args.start_time,
            end_time:    args.end_time,
            shift_type:  0
          })
          .select('id, shift_date, start_time, end_time')
          .single();

        if (error) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Kunne ikke lagre skiftet'
          });
        } else {
          const hours = hoursBetween(args.start_time, args.end_time);
          toolResult = JSON.stringify({
            status: 'ok',
            inserted: [insertedShift],
            updated: [],
            deleted: [],
            shift_summary: `1 skift lagret (${hours} timer)`
          });
        }
      }
    }

    if (fnName === 'addSeries') {
      // Require from_date/to_date for consistency
      const dates = generateSeriesDates(args.from_date, args.to_date, args.days, args.interval_weeks, args.offset_start);
      if (!dates.length) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Ingen matchende datoer funnet'
        });
      } else {
        const seriesId = randomUUID();
        const rows = dates.map(d => ({
          user_id:    user_id,
          shift_date: d.toISOString().slice(0, 10),
          start_time: args.start,
          end_time:   args.end,
          shift_type: 0,
          series_id: seriesId
        }));

        // Filter out duplicates before inserting
        const { data: existingShifts } = await supabase
          .from('user_shifts')
          .select('shift_date, start_time, end_time')
          .eq('user_id', user_id);

        const existingKeys = new Set(
          existingShifts?.map(s => `${s.shift_date}|${s.start_time}|${s.end_time}`) || []
        );

        const newRows = rows.filter(row =>
          !existingKeys.has(`${row.shift_date}|${row.start_time}|${row.end_time}`)
        );

        if (newRows.length > 0) {
          const { data: insertedShifts, error } = await supabase
            .from('user_shifts')
            .insert(newRows)
            .select('id, shift_date, start_time, end_time, series_id');

          if (error) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Kunne ikke lagre serien'
            });
          } else {
            const totalHours = hoursBetween(args.start, args.end) * newRows.length;
            const duplicates = rows.length - newRows.length;

            let summary;
            if (duplicates > 0) {
              summary = `${newRows.length} nye skift lagret (${totalHours} timer), ${duplicates} eksisterte fra før`;
            } else {
              summary = `${newRows.length} skift lagret (${totalHours} timer)`;
            }

            toolResult = JSON.stringify({
              status: 'ok',
              inserted: insertedShifts || [],
              updated: [],
              deleted: [],
              shift_summary: summary,
              series_id: seriesId
            });
          }
        } else {
          toolResult = JSON.stringify({
            status: 'duplicate',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: `Alle ${rows.length} skift eksisterte fra før`
          });
        }
      }
    }

    if (fnName === 'editShift') {
      let existingShift = null;
      let shiftId = args.shift_id;

      // Find shift by ID, specific date+time, or natural language reference
      if (args.shift_id) {
        // Find by ID (existing behavior)
        const { data } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('id', args.shift_id)
          .eq('user_id', user_id)
          .maybeSingle();
        existingShift = data;
      } else if (args.shift_date && args.start_time) {
        // Find by specific date+time
        const { data } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', user_id)
          .eq('shift_date', args.shift_date)
          .eq('start_time', args.start_time);

        if (!data || data.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Fant ikke skiftet for den datoen og tiden'
          });
        } else if (data.length > 1) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Flere skift funnet for samme dato og tid. Vennligst presiser hvilken du vil redigere'
          });
        } else {
          existingShift = data[0];
          shiftId = existingShift.id;
        }
      } else if (args.date_reference) {
        // Find by natural language reference
        const { shifts, error } = await findShiftsByReference(user_id, args.date_reference, args.time_reference);

        if (error) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: error
          });
        } else if (shifts.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ingen skift funnet for den referansen'
          });
        } else if (shifts.length > 1) {
          const shiftList = shifts.map(s => `${s.start_time}-${s.end_time}`).join(', ');
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: `Flere skift funnet (${shiftList}). Vennligst presiser hvilken du vil redigere`
          });
        } else {
          existingShift = shifts[0];
          shiftId = existingShift.id;
        }
      } else {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Du må oppgi enten shift_id, shift_date+start_time, eller date_reference'
        });
      }

      if (existingShift && !toolResult.startsWith('ERROR:')) {
        // Validate employee_id if provided
        if (args.employee_id !== undefined) {
          const validation = await validateEmployeeOwnership(user_id, args.employee_id);
          if (!validation.valid) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: validation.error
            });
            return toolResult;
          }
        }

        // Build update object with only provided fields
        const updateData = {};

        // Handle new field names with fallback to legacy names
        const newStartTime = args.new_start_time || args.start_time;
        const newEndTime = args.new_end_time || args.end_time;
        const newDate = args.new_shift_date || null;
        const newType = (args.new_shift_type !== undefined && args.new_shift_type !== null)
          ? parseInt(args.new_shift_type)
          : undefined;

        // Only update shift_date if provided and different
        if (newDate && newDate !== existingShift.shift_date) {
          updateData.shift_date = newDate;
        } else if (args.shift_date && args.shift_date !== existingShift.shift_date) {
          // Back-compat: allow updating to shift_date field name
          updateData.shift_date = args.shift_date;
        }
        if (newStartTime && newStartTime !== existingShift.start_time) {
          updateData.start_time = newStartTime;
        }
        if (newEndTime && newEndTime !== existingShift.end_time) {
          updateData.end_time = newEndTime;
        }
        if (newType !== undefined && !Number.isNaN(newType)) {
          updateData.shift_type = newType;
        }
        // Intentionally do not allow changing employee linkage via the agent

        // Check for collision with other shifts (excluding current shift)
        if (Object.keys(updateData).length > 0) {
          const checkDate = updateData.shift_date || existingShift.shift_date;
          const checkStart = updateData.start_time || existingShift.start_time;
          const checkEnd = updateData.end_time || existingShift.end_time;

          const { data: collision } = await supabase
            .from('user_shifts')
            .select('id')
            .eq('user_id', user_id)
            .eq('shift_date', checkDate)
            .eq('start_time', checkStart)
            .eq('end_time', checkEnd)
            .neq('id', shiftId)
            .maybeSingle();

          if (collision) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Et skift med samme tid eksisterer allerede'
            });
          } else {
            // Perform update
            const { data: updatedShift, error } = await supabase
              .from('user_shifts')
              .update(updateData)
              .eq('id', shiftId)
              .eq('user_id', user_id)
              .select('id, shift_date, start_time, end_time')
              .single();

            if (error) {
              toolResult = JSON.stringify({
                status: 'error',
                inserted: [],
                updated: [],
                deleted: [],
                shift_summary: 'Kunne ikke oppdatere skiftet'
              });
            } else {
              const finalStart = updateData.start_time || existingShift.start_time;
              const finalEnd = updateData.end_time || existingShift.end_time;
              const hours = hoursBetween(finalStart, finalEnd);
              toolResult = JSON.stringify({
                status: 'ok',
                inserted: [],
                updated: [updatedShift],
                deleted: [],
                shift_summary: `1 skift oppdatert (${hours} timer)`
              });
            }
          }
        } else {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ingen endringer spesifisert'
          });
        }
      } else if (!toolResult.includes('"status"')) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Skiftet ble ikke funnet eller tilhører ikke deg'
        });
      }
    }

    if (fnName === 'deleteShift') {
      let existingShift = null;
      let shiftId = args.shift_id;

      // Find shift by ID, specific date+time, or natural language reference
      if (args.shift_id) {
        // Find by ID (existing behavior)
        const { data } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('id', args.shift_id)
          .eq('user_id', user_id)
          .maybeSingle();
        existingShift = data;
      } else if (args.shift_date && args.start_time) {
        // Find by specific date+time
        const { data } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', user_id)
          .eq('shift_date', args.shift_date)
          .eq('start_time', args.start_time)
          .maybeSingle();
        existingShift = data;
        if (existingShift) {
          shiftId = existingShift.id;
        }
      } else if (args.date_reference) {
        // Find by natural language reference
        const { shifts, error } = await findShiftsByReference(user_id, args.date_reference, args.time_reference);

        if (error) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: error
          });
        } else if (shifts.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ingen skift funnet for den referansen'
          });
        } else if (shifts.length > 1) {
          const shiftList = shifts.map(s => `${s.start_time}-${s.end_time}`).join(', ');
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: `Flere skift funnet (${shiftList}). Vennligst presiser hvilken du vil slette`
          });
        } else {
          existingShift = shifts[0];
          shiftId = existingShift.id;
        }
      } else {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Du må oppgi enten shift_id, shift_date+start_time, eller date_reference'
        });
      }

      // Proceed with deletion if shift was found
      if (existingShift && !toolResult) {
        const { error } = await supabase
          .from('user_shifts')
          .delete()
          .eq('id', shiftId)
          .eq('user_id', user_id);

        if (error) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Kunne ikke slette skiftet'
          });
        } else {
          const hours = hoursBetween(existingShift.start_time, existingShift.end_time);
          toolResult = JSON.stringify({
            status: 'ok',
            inserted: [],
            updated: [],
            deleted: [{ id: existingShift.id, shift_date: existingShift.shift_date, start_time: existingShift.start_time, end_time: existingShift.end_time }],
            shift_summary: `1 skift slettet (${hours} timer)`
          });
        }
      } else if (!existingShift && !toolResult) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Skiftet ble ikke funnet eller tilhører ikke deg'
        });
      }
    }

    if (fnName === 'deleteSeries') {
      // Handle shift_ids first - if provided, ignore other criteria
      if (args.shift_ids && Array.isArray(args.shift_ids) && args.shift_ids.length > 0) {
        // Get shifts to be deleted for summary
        const { data: shiftsToDelete, error: fetchError } = await supabase
          .from('user_shifts')
          .select('id, shift_date, start_time, end_time')
          .eq('user_id', user_id)
          .in('id', args.shift_ids);

        if (fetchError) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Kunne ikke hente skift for sletting'
          });
        } else if (!shiftsToDelete || shiftsToDelete.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ingen av de spesifiserte skiftene ble funnet'
          });
        } else {
          // Delete the shifts
          const { error: deleteError } = await supabase
            .from('user_shifts')
            .delete()
            .eq('user_id', user_id)
            .in('id', args.shift_ids);

          if (deleteError) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Kunne ikke slette skiftene'
            });
          } else {
            const totalHours = shiftsToDelete.reduce((sum, shift) => {
              return sum + hoursBetween(shift.start_time, shift.end_time);
            }, 0);

            toolResult = JSON.stringify({
              status: 'ok',
              inserted: [],
              updated: [],
              deleted: shiftsToDelete,
              shift_summary: `${shiftsToDelete.length} skift slettet (${totalHours} timer)`
            });
          }
        }
      } else {
        // Original criteria-based deletion logic
        let deleteQuery = supabase
          .from('user_shifts')
          .delete()
          .eq('user_id', user_id);

        let criteriaDescription = '';

        if (args.criteria_type === 'week') {
        if (!args.week_number || !args.year) {
          // If no week_number/year specified, delete next week
          const { start, end } = getNextWeeksDateRange(1);
          deleteQuery = deleteQuery.gte('shift_date', start).lte('shift_date', end);
          criteriaDescription = 'neste uke';
        } else {
          const { start, end } = getWeekDateRange(args.week_number, args.year);
          deleteQuery = deleteQuery.gte('shift_date', start).lte('shift_date', end);
          criteriaDescription = `uke ${args.week_number} i ${args.year}`;
        }
      } else if (args.criteria_type === 'date_range') {
          if (!args.from_date || !args.to_date) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Fra-dato og til-dato må spesifiseres for periode-sletting'
            });
          } else {
            deleteQuery = deleteQuery.gte('shift_date', args.from_date).lte('shift_date', args.to_date);
            criteriaDescription = `periode ${args.from_date} til ${args.to_date}`;
          }
        } else if (args.criteria_type === 'series_id') {
          if (!args.series_id) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Serie-ID må spesifiseres for serie-sletting'
            });
          } else {
            deleteQuery = deleteQuery.eq('series_id', args.series_id);
            criteriaDescription = `serie ${args.series_id}`;
          }
        } else {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ugyldig slette-kriterium'
          });
        }

        // Only proceed if no error so far
        if (!toolResult.includes('"status"')) {
          // First, get shifts to be deleted for summary
          let selectQuery = supabase
            .from('user_shifts')
            .select('id, shift_date, start_time, end_time')
            .eq('user_id', user_id);

          if (args.criteria_type === 'week') {
            if (!args.week_number || !args.year) {
              // If no week_number/year specified, delete next week
              const { start, end } = getNextWeeksDateRange(1);
              selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
            } else {
              const { start, end } = getWeekDateRange(args.week_number, args.year);
              selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
            }
          } else if (args.criteria_type === 'date_range') {
            selectQuery = selectQuery.gte('shift_date', args.from_date).lte('shift_date', args.to_date);
          } else if (args.criteria_type === 'series_id') {
            selectQuery = selectQuery.eq('series_id', args.series_id);
          }

          const { data: shiftsToDelete, error: selectError } = await selectQuery;

          if (selectError) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Kunne ikke hente skift for sletting'
            });
          } else if (!shiftsToDelete || shiftsToDelete.length === 0) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: `Ingen skift funnet for ${criteriaDescription}`
            });
          } else {
            // Perform the deletion
            const { error } = await deleteQuery;

            if (error) {
              toolResult = JSON.stringify({
                status: 'error',
                inserted: [],
                updated: [],
                deleted: [],
                shift_summary: 'Kunne ikke slette skiftene'
              });
            } else {
              const totalHours = shiftsToDelete.reduce((sum, shift) => {
                return sum + hoursBetween(shift.start_time, shift.end_time);
              }, 0);

              toolResult = JSON.stringify({
                status: 'ok',
                inserted: [],
                updated: [],
                deleted: shiftsToDelete,
                shift_summary: `${shiftsToDelete.length} skift slettet for ${criteriaDescription} (${totalHours} timer)`
              });
            }
          }
        }
      }
    }

    if (fnName === 'getShifts') {
      let selectQuery = supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .order('shift_date');

      let criteriaDescription = '';

      if (args.criteria_type === 'week') {
        if (!args.week_number || !args.year) {
          // If no week_number/year specified, get current week
          const { start, end } = getCurrentWeekDateRange();
          selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
          criteriaDescription = 'denne uka';
        } else {
          const { start, end } = getWeekDateRange(args.week_number, args.year);
          selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
          criteriaDescription = `uke ${args.week_number} i ${args.year}`;
        }
      } else if (args.criteria_type === 'date_range') {
        if (!args.from_date || !args.to_date) {
          toolResult = 'ERROR: Fra-dato og til-dato må spesifiseres for periode-spørring';
        } else {
          selectQuery = selectQuery.gte('shift_date', args.from_date).lte('shift_date', args.to_date);
          criteriaDescription = `periode ${args.from_date} til ${args.to_date}`;
        }
      } else if (args.criteria_type === 'next') {
        const numWeeks = args.num_weeks || 1;
        const { start, end } = getNextWeeksDateRange(numWeeks);
        selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
        criteriaDescription = numWeeks === 1 ? 'neste uke' : `neste ${numWeeks} uker`;
      } else if (args.criteria_type === 'all') {
        criteriaDescription = 'alle skift';
        // No additional filters needed for 'all'
      } else {
        toolResult = 'ERROR: Ugyldig spørring-kriterium';
      }

      // Only proceed if no error so far
      if (!toolResult.startsWith('ERROR:')) {
        const { data: shifts, error } = await selectQuery;

        if (error) {
          toolResult = 'ERROR: Kunne ikke hente skift';
        } else if (!shifts || shifts.length === 0) {
          toolResult = `NONE: Ingen skift funnet for ${criteriaDescription}`;
        } else {
          // Get user settings for wage calculations
          const userSettings = await getUserSettings(user_id);

      // Calculate detailed wage data for each shift
      let totalHours = 0;
      let totalEarnings = 0;

      const detailedShifts = shifts.map(shift => {
        const calc = calculateShiftEarnings(shift, userSettings);
        totalHours += calc.hours;
        totalEarnings += calc.total;

        return {
          id: shift.id,
          date: shift.shift_date,
          startTime: shift.start_time,
          endTime: shift.end_time,
          type: shift.shift_type,
          duration: calc.totalHours,
          paidHours: calc.hours,
          baseWage: calc.baseWage,
          bonus: calc.bonus,
          totalEarnings: calc.total,
          pauseDeducted: calc.pauseDeducted
        };
      });

          // Return structured data including totals for reliable tool consumption
          toolResult = JSON.stringify({
            period: criteriaDescription,
            shifts: detailedShifts,
            summary: {
              totalShifts: shifts.length,
              totalHours: parseFloat(totalHours.toFixed(2)),
              totalEarnings: parseFloat(totalEarnings.toFixed(2))
            }
          });
        }
      }
    }

    // No employee lookup tools are exposed to the agent by design

    if (fnName === 'copyShift') {
      // Find the source shift using natural language reference
      const { shifts: sourceShifts, error } = await findShiftsByReference(
        user_id,
        args.source_date_reference,
        args.source_time_reference
      );

      if (error) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: `Kunne ikke finne kildeskift: ${error}`
        });
      } else if (sourceShifts.length === 0) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Ingen skift funnet for den referansen'
        });
      } else if (sourceShifts.length > 1) {
        const shiftList = sourceShifts.map(s => `${s.start_time}-${s.end_time}`).join(', ');
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: `Flere skift funnet (${shiftList}). Vennligst presiser hvilken du vil kopiere`
        });
      } else {
        // Found exactly one source shift
        const sourceShift = sourceShifts[0];
        let targetDates = [];

        // Determine target dates
        if (args.target_dates && args.target_dates.length > 0) {
          targetDates = args.target_dates;
        } else if (args.target_date_references && args.target_date_references.length > 0) {
          // Parse natural language target date references
          for (const ref of args.target_date_references) {
            const parsedDate = parseNaturalDate(ref);
            if (parsedDate) {
              targetDates.push(parsedDate);
            }
          }
        } else if (args.weeks_ahead) {
          // Generate dates for the same weekday for the specified number of weeks ahead
          const sourceDate = new Date(sourceShift.shift_date);
          const sourceDayOfWeek = sourceDate.getDay();

          for (let week = 1; week <= args.weeks_ahead; week++) {
            const targetDate = new Date(sourceDate);
            targetDate.setDate(sourceDate.getDate() + (week * 7));
            targetDates.push(targetDate.toISOString().slice(0, 10));
          }
        }

        if (targetDates.length === 0) {
          toolResult = JSON.stringify({
            status: 'error',
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: 'Ingen måldatoer spesifisert eller kunne ikke tolke datoene'
          });
        } else {
          // Create shifts for target dates
          const newShifts = targetDates.map(date => ({
            user_id,
            shift_date: date,
            start_time: sourceShift.start_time,
            end_time: sourceShift.end_time,
            shift_type: sourceShift.shift_type || 0
          }));

          // Check for existing shifts to avoid duplicates
          const { data: existingShifts } = await supabase
            .from('user_shifts')
            .select('shift_date, start_time, end_time')
            .eq('user_id', user_id)
            .in('shift_date', targetDates);

          const existingKeys = new Set(
            existingShifts?.map(s => `${s.shift_date}|${s.start_time}|${s.end_time}`) || []
          );

          const shiftsToInsert = newShifts.filter(shift =>
            !existingKeys.has(`${shift.shift_date}|${shift.start_time}|${shift.end_time}`)
          );

          if (shiftsToInsert.length === 0) {
            toolResult = JSON.stringify({
              status: 'error',
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: 'Alle skift eksisterer allerede for de spesifiserte datoene'
            });
          } else {
            // Insert new shifts
            const { data: insertedShifts, error: insertError } = await supabase
              .from('user_shifts')
              .insert(shiftsToInsert)
              .select();

            if (insertError) {
              toolResult = JSON.stringify({
                status: 'error',
                inserted: [],
                updated: [],
                deleted: [],
                shift_summary: 'Kunne ikke kopiere skift'
              });
            } else {
              const totalHours = shiftsToInsert.reduce((sum, shift) => {
                return sum + hoursBetween(shift.start_time, shift.end_time);
              }, 0);

              toolResult = JSON.stringify({
                status: 'ok',
                inserted: insertedShifts || shiftsToInsert,
                updated: [],
                deleted: [],
                shift_summary: `${shiftsToInsert.length} skift kopiert fra ${sourceShift.shift_date} (${totalHours} timer totalt)`
              });
            }
          }
        }
      }
    }

    // New wage data functions
    if (fnName === 'getWageDataByWeek') {
      let selectQuery = supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .order('shift_date');

      let criteriaDescription = '';

      if (!args.week_number || !args.year) {
        // If no week_number/year specified, get current week
        const { start, end } = getCurrentWeekDateRange();
        selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
        criteriaDescription = 'denne uka';
      } else {
        const { start, end } = getWeekDateRange(args.week_number, args.year);
        selectQuery = selectQuery.gte('shift_date', start).lte('shift_date', end);
        criteriaDescription = `uke ${args.week_number} i ${args.year}`;
      }

      const { data: shifts, error } = await selectQuery;

      if (error) {
        toolResult = 'ERROR: Kunne ikke hente lønnsdata';
      } else if (!shifts || shifts.length === 0) {
        toolResult = `NONE: Ingen skift funnet for ${criteriaDescription}`;
      } else {
        // Get user settings for wage calculations
        const userSettings = await getUserSettings(user_id);

        // Calculate detailed wage data for each shift
        let totalHours = 0;
        let totalEarnings = 0;
        let totalBaseWage = 0;
        let totalBonus = 0;

        const detailedShifts = shifts.map(shift => {
          const calc = calculateShiftEarnings(shift, userSettings);
          totalHours += calc.hours;
          totalEarnings += calc.total;
          totalBaseWage += calc.baseWage;
          totalBonus += calc.bonus;

          return {
            id: shift.id,
            date: shift.shift_date,
            startTime: shift.start_time,
            endTime: shift.end_time,
            type: shift.shift_type,
            duration: calc.totalHours,
            paidHours: calc.hours,
            baseWage: calc.baseWage,
            bonus: calc.bonus,
            totalEarnings: calc.total,
            pauseDeducted: calc.pauseDeducted
          };
        });

        toolResult = JSON.stringify({
          period: criteriaDescription,
          shifts: detailedShifts,
          summary: {
            totalShifts: shifts.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalEarnings: parseFloat(totalEarnings.toFixed(2)),
            totalBaseWage: parseFloat(totalBaseWage.toFixed(2)),
            totalBonus: parseFloat(totalBonus.toFixed(2)),
            averageHoursPerShift: parseFloat((totalHours / shifts.length).toFixed(2)),
            averageEarningsPerShift: parseFloat((totalEarnings / shifts.length).toFixed(2))
          }
        });
      }
    }

    if (fnName === 'getWageDataByMonth') {
      // Use viewing context if no month/year specified
      const targetMonth = args.month || viewingMonth;
      const targetYear = args.year || viewingYear;

      const firstDay = new Date(targetYear, targetMonth - 1, 1).toISOString().slice(0, 10);
      const lastDay = new Date(targetYear, targetMonth, 0).toISOString().slice(0, 10);

      const { data: shifts, error } = await supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .gte('shift_date', firstDay)
        .lte('shift_date', lastDay)
        .order('shift_date');

      const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
      const criteriaDescription = `${monthNames[targetMonth - 1]} ${targetYear}`;

      if (error) {
        toolResult = 'ERROR: Kunne ikke hente lønnsdata';
      } else if (!shifts || shifts.length === 0) {
        toolResult = `NONE: Ingen skift funnet for ${criteriaDescription}`;
      } else {
        // Get user settings for wage calculations
        const userSettings = await getUserSettings(user_id);

        // Calculate detailed wage data for each shift
        let totalHours = 0;
        let totalEarnings = 0;
        let totalBaseWage = 0;
        let totalBonus = 0;

        const detailedShifts = shifts.map(shift => {
          const calc = calculateShiftEarnings(shift, userSettings);
          totalHours += calc.hours;
          totalEarnings += calc.total;
          totalBaseWage += calc.baseWage;
          totalBonus += calc.bonus;

          return {
            id: shift.id,
            date: shift.shift_date,
            startTime: shift.start_time,
            endTime: shift.end_time,
            type: shift.shift_type,
            duration: calc.totalHours,
            paidHours: calc.hours,
            baseWage: calc.baseWage,
            bonus: calc.bonus,
            totalEarnings: calc.total,
            pauseDeducted: calc.pauseDeducted
          };
        });

        toolResult = JSON.stringify({
          period: criteriaDescription,
          shifts: detailedShifts,
          summary: {
            totalShifts: shifts.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalEarnings: parseFloat(totalEarnings.toFixed(2)),
            totalBaseWage: parseFloat(totalBaseWage.toFixed(2)),
            totalBonus: parseFloat(totalBonus.toFixed(2)),
            averageHoursPerShift: parseFloat((totalHours / shifts.length).toFixed(2)),
            averageEarningsPerShift: parseFloat((totalEarnings / shifts.length).toFixed(2))
          }
        });
      }
    }

    if (fnName === 'getWageDataByDateRange') {
      const { data: shifts, error } = await supabase
        .from('user_shifts')
        .select('*')
        .eq('user_id', user_id)
        .gte('shift_date', args.from_date)
        .lte('shift_date', args.to_date)
        .order('shift_date');

      const criteriaDescription = `${args.from_date} til ${args.to_date}`;

      if (error) {
        toolResult = 'ERROR: Kunne ikke hente lønnsdata';
      } else if (!shifts || shifts.length === 0) {
        toolResult = `NONE: Ingen skift funnet for perioden ${criteriaDescription}`;
      } else {
        // Get user settings for wage calculations
        const userSettings = await getUserSettings(user_id);

        // Calculate detailed wage data for each shift
        let totalHours = 0;
        let totalEarnings = 0;
        let totalBaseWage = 0;
        let totalBonus = 0;

        const detailedShifts = shifts.map(shift => {
          const calc = calculateShiftEarnings(shift, userSettings);
          totalHours += calc.hours;
          totalEarnings += calc.total;
          totalBaseWage += calc.baseWage;
          totalBonus += calc.bonus;

          return {
            id: shift.id,
            date: shift.shift_date,
            startTime: shift.start_time,
            endTime: shift.end_time,
            type: shift.shift_type,
            duration: calc.totalHours,
            paidHours: calc.hours,
            baseWage: calc.baseWage,
            bonus: calc.bonus,
            totalEarnings: calc.total,
            pauseDeducted: calc.pauseDeducted
          };
        });

        toolResult = JSON.stringify({
          period: criteriaDescription,
          shifts: detailedShifts,
          summary: {
            totalShifts: shifts.length,
            totalHours: parseFloat(totalHours.toFixed(2)),
            totalEarnings: parseFloat(totalEarnings.toFixed(2)),
            totalBaseWage: parseFloat(totalBaseWage.toFixed(2)),
            totalBonus: parseFloat(totalBonus.toFixed(2)),
            averageHoursPerShift: parseFloat((totalHours / shifts.length).toFixed(2)),
            averageEarningsPerShift: parseFloat((totalEarnings / shifts.length).toFixed(2))
          }
        });
      }
    }

    return toolResult;
}

// ---------- export / run ----------
// Serve static files (opt-in)
// In dev (or when ENABLE_STATIC=true), expose only the needed static folders
// rather than the entire repo root.
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_STATIC === 'true') {
  const staticRoot = process.env.STATIC_DIR
    ? path.resolve(__dirname, process.env.STATIC_DIR)
    : path.resolve(__dirname, '..');

  // Root landing page assets
  app.use('/css', express.static(path.join(staticRoot, 'css')));
  app.use('/js', express.static(path.join(staticRoot, 'js')));
  app.use('/assets', express.static(path.join(staticRoot, 'assets')));

  // Legacy kalkulator static serving removed after split into app/ + marketing/

  // Common root files
  app.get('/favicon.ico', (req, res) =>
    res.sendFile(path.join(staticRoot, 'assets', 'favicon.ico'))
  );
  app.get('/robots.txt', (req, res) =>
    res.sendFile(path.join(staticRoot, 'robots.txt'))
  );
  app.get('/sitemap.xml', (req, res) =>
    res.sendFile(path.join(staticRoot, 'sitemap.xml'))
  );

  // Root index
  app.get('/', (req, res) => {
    res.sendFile(path.join(staticRoot, 'index.html'));
  });

  // No dedicated /kalkulator mount; marketing handles redirect to app domain
}

// ---------- API Routes with /api prefix ----------

/**
 * GET /api/employees - List all employees for the authenticated manager
 * Query params: ?include_archived=1 to include archived employees
 */
app.get('/api/employees', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    const bodyPreview = (() => { try { return JSON.stringify(req.body || {}); } catch (_) { return '[unserializable]'; }})();
    console.log(`[route] GET /api/employees authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId ? resolvedUserId.slice(0,6) + '…' + resolvedUserId.slice(-4) : 'none'} body=${bodyPreview}`);
  } catch (_) {}

  try {
    const userId = req?.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Missing userId" });

    const includeArchived = req.query.include_archived === '1';

    let query = supabase
      .from('employees')
      .select('id, name, email, hourly_wage, tariff_level, birth_date, display_color, created_at, archived_at')
      .eq('manager_id', userId)
      .order('name');

    // By default, exclude archived employees
    if (!includeArchived) {
      query = query.is('archived_at', null);
    }

    const { data: employees, error } = await query;

    if (error) {
      console.error("[/api/employees] DB error:", error.message, error.stack);
      return res.status(500).json({
        error: error.message,
        code: error.code || null,
        stack: process.env.NODE_ENV === "production" ? undefined : error.stack
      });
    }

    const normalized = (employees || []).map(emp => ({
      ...emp,
      name: normalizeEmployeeName(emp?.name)
    }));

    res.json({ employees: normalized });
  } catch (e) {
    console.error("[/api/employees] Exception:", e.message, e.stack);
    return res.status(500).json({
      error: e.message,
      code: e.code || null,
      stack: process.env.NODE_ENV === "production" ? undefined : e.stack
    });
  }
});

/**
 * GET /api/settings - Get user settings
 */
app.get('/api/settings', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    const bodyPreview = (() => { try { return JSON.stringify(req.body || {}); } catch (_) { return '[unserializable]'; }})();
    console.log(`[route] GET /api/settings authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId ? resolvedUserId.slice(0,6) + '…' + resolvedUserId.slice(-4) : 'none'} body=${bodyPreview}`);
  } catch (_) {}

  try {
    const userId = req?.auth?.userId;
    if (!userId) return res.status(401).json({ error: "Missing userId" });

    const { data, error } = await supabase
      .from('user_settings')
      .select('custom_wage, profile_picture_url, show_employee_tab')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // If column missing, degrade gracefully
      const msg = (error?.message || '').toString();
      const isMissingColumn = msg.includes('profile_picture_url') || msg.includes('show_employee_tab') || (error?.code === '42703');
      const isMissingTable = (error?.code === '42P01') || msg.includes('relation') && msg.includes('does not exist');
      if (!isMissingColumn && !isMissingTable) {
        console.error("[/api/settings] DB error:", error.message, error.stack);
        return res.status(500).json({
          error: error.message,
          code: error.code || null,
          stack: process.env.NODE_ENV === "production" ? undefined : error.stack
        });
      }
      // Degrade gracefully on schema drift (missing table/column)
      console.warn('[/api/settings] schema drift – degrading:', { code: error?.code, msg });
    }

    return res.json({
      custom_wage: data?.custom_wage ?? 0,
      profile_picture_url: data?.profile_picture_url ?? null,
      show_employee_tab: data?.show_employee_tab ?? true
    });
  } catch (e) {
    console.error("[/api/settings] Exception:", e.message, e.stack);
    return res.status(500).json({
      error: e.message,
      code: e.code || null,
      stack: process.env.NODE_ENV === "production" ? undefined : e.stack
    });
  }
});


// ---------- WebSocket connection management ----------
const wsConnections = new Map(); // Map<connectionId, { ws, userId, lastPing }>

// Use Supabase remote JWKS for WebSocket auth (ES256)
const SUPABASE_JWKS_URL = process.env.SUPABASE_JWKS_URL || 'https://id.kkarlsen.dev/auth/v1/.well-known/jwks.json';
const WS_JWKS = createRemoteJWKSet(new URL(SUPABASE_JWKS_URL));

function handleWebSocketConnection(ws, req) {
  const connectionId = randomUUID();
  let isAuthenticated = false;
  let userId = null;
  
  console.log(`[WS] New connection: ${connectionId}`);
  // Initialize per-connection progress trace
  try { ws._trace = []; ws._trace_idx = 0; } catch (_) {}
  try {
    console.log('[WS] Connection header sec-websocket-protocol:', req?.headers?.['sec-websocket-protocol'] || '(none)', 'selected=', ws.protocol || '(none)');
  } catch (_) {}

  // Enforce selected subprotocol
  if (ws.protocol !== 'jwt') {
    try { ws.close(4001, 'Missing jwt subprotocol'); } catch (_) {}
    return;
  }
  
  // Set connection timeout for authentication
  const authTimeout = setTimeout(() => {
    if (!isAuthenticated) {
      console.log(`[WS] Authentication timeout for ${connectionId}`);
      ws.close(4001, 'Authentication timeout');
    }
  }, 30000); // 30 second auth timeout

  // Attempt auth via WebSocket subprotocols: ["jwt", token]
  try {
    const protoHeader = req.headers['sec-websocket-protocol'];
    if (protoHeader) {
      const parts = String(protoHeader).split(',').map(s => s.trim());
      if (parts.length >= 2 && parts[0] === 'jwt') {
        const token = parts[1];
        if (token) {
          jwtVerify(token, WS_JWKS, { algorithms: ['ES256'] })
            .then(({ payload }) => {
              if (payload?.sub) {
                userId = payload.sub;
                isAuthenticated = true;
                clearTimeout(authTimeout);
                wsConnections.set(connectionId, { ws, userId, lastPing: Date.now() });
                try { ws._isAuthenticated = true; ws._userId = userId; } catch (_) {}
                ws.send(JSON.stringify({ type: 'auth_success', connectionId, message: 'WebSocket authenticated successfully' }));
                console.log(`[WS] Authenticated (protocol) user ${userId} on connection ${connectionId}`);
              } else {
                ws.close(4001, 'Invalid authentication token');
              }
            })
            .catch((err) => {
              console.error('[WS] Protocol auth error:', err?.message || err);
              try { ws.close(4001, 'Authentication failed'); } catch (_) {}
            });
        }
      }
    }
  } catch (err) {
    console.error('[WS] Failed to parse subprotocol auth:', err?.message || err);
  }
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (!isAuthenticated && message.type === 'auth') {
        // Handle authentication
        const token = message.token;
        if (!token) {
          ws.close(4001, 'Missing authentication token');
          return;
        }
        
        try {
          // Verify JWT using remote JWKS (ES256)
          const { payload } = await jwtVerify(token, WS_JWKS, { algorithms: ['ES256'] });
          if (payload?.sub) {
            userId = payload.sub;
            isAuthenticated = true;
            clearTimeout(authTimeout);
            
            // Store connection
            wsConnections.set(connectionId, {
              ws,
              userId,
              lastPing: Date.now()
            });
            try { ws._isAuthenticated = true; ws._userId = userId; } catch (_) {}
            
            ws.send(JSON.stringify({ 
              type: 'auth_success', 
              connectionId,
              message: 'WebSocket authenticated successfully' 
            }));
            
            console.log(`[WS] Authenticated user ${userId} on connection ${connectionId}`);
          } else {
            ws.close(4001, 'Invalid authentication token');
            return;
          }
        } catch (error) {
          console.error(`[WS] Auth error:`, error);
          ws.close(4001, 'Authentication failed');
          return;
        }
      } else if (!isAuthenticated) {
        ws.close(4001, 'Not authenticated');
        return;
      } else if (message.type === 'ping') {
        // Handle ping for keepalive
        const connection = wsConnections.get(connectionId);
        if (connection) {
          connection.lastPing = Date.now();
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } else if (message.type === 'chat') {
        // Handle chat message - delegate to chat handler
        handleWebSocketChat(ws, userId, message, connectionId);
      }
    } catch (error) {
      console.error(`[WS] Message parsing error:`, error);
      ws.close(4002, 'Invalid message format');
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log(`[WS] Connection closed: ${connectionId}, code: ${code}, reason: ${reason}`);
    clearTimeout(authTimeout);
    wsConnections.delete(connectionId);
  });
  
  ws.on('error', (error) => {
    console.error(`[WS] Connection error for ${connectionId}:`, error);
    wsConnections.delete(connectionId);
  });
}

// Shared chat request handler for both SSE and WebSocket
async function handleChatRequest(req, res, chatTools, _wsForProgress = null) {
  const { messages: rawMessages } = req.body;
  const messages = Array.isArray(rawMessages) ? [...rawMessages] : [];
  // Inject auth context for model if WS is authenticated
  try {
    if (_wsForProgress && _wsForProgress._isAuthenticated) {
      messages.unshift({ role: 'system', content: 'ctx.isAuthenticated=true userId=' + (_wsForProgress._userId || '') });
    }
  } catch (_) {}
  // Removed inline time/month prompt context; SYSTEM_PROMPT is static now.

  const systemContextHint = { role: 'system', content: SYSTEM_PROMPT };

  // Maintain a single messages array for the agent loop
  const convo = [systemContextHint, ...messages];
  const startedAt = Date.now();

  let finalAssistantContent = null;
  let iter = 0;
  let done = false;

  res.write(`data: ${JSON.stringify({ type: 'status', message: 'Tenker' })}\n\n`);

  while (!done && iter < MAX_ITERATIONS && (Date.now() - startedAt) < WALL_CLOCK_CAP_MS) {
    iter += 1;
    const t0 = Date.now();
    // Sanitize conversation to avoid sending assistant messages with tool_calls: []
    const sanitizedConvo = (function sanitizeMessagesForOpenAI(msgs) {
      try {
        return msgs.map(m => {
          if (m && m.role === 'assistant') {
            if (Array.isArray(m.tool_calls)) {
              if (m.tool_calls.length === 0) {
                const { tool_calls, ...rest } = m;
                return rest;
              }
              // Ensure content is null when tool_calls exist
              return { ...m, content: m.content ?? null };
            }
          }
          return m;
        });
      } catch (_) {
        return msgs;
      }
    })(convo);
    
    // One model turn - with streaming for reasoning phase
    let msg, toolCalls;
    // Always stream for better UX (both WebSocket and SSE)
    const streamedTurn = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: sanitizedConvo,
      tools: chatTools,
      tool_choice: 'auto',
      stream: true
    });

    // Send reasoning stream start event
    const reasoningStartTime = Date.now();
    res.write(`data: ${JSON.stringify({ type: 'reasoning_start', iteration: iter, timestamp: reasoningStartTime })}\n\n`);

    let accumulatedContent = '';
    let accumulatedToolCalls = [];
    
    for await (const chunk of streamedTurn) {
      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      // Stream reasoning content if present
      if (delta.content) {
        accumulatedContent += delta.content;
        res.write(`data: ${JSON.stringify({ type: 'reasoning_chunk', content: delta.content, iteration: iter, timestamp: Date.now() })}\n\n`);
      }

      // Collect tool calls with proper index handling
      if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
        delta.tool_calls.forEach((toolCall) => {
          const toolIndex = toolCall.index;
          if (toolIndex === undefined) return;
          
          // Initialize tool call object if it doesn't exist
          if (!accumulatedToolCalls[toolIndex]) {
            accumulatedToolCalls[toolIndex] = { 
              id: '', 
              type: 'function', 
              function: { name: '', arguments: '' } 
            };
          }
          
          // Update tool call properties
          if (toolCall.id) accumulatedToolCalls[toolIndex].id = toolCall.id;
          if (toolCall.type) accumulatedToolCalls[toolIndex].type = toolCall.type;
          if (toolCall.function?.name) {
            accumulatedToolCalls[toolIndex].function.name = toolCall.function.name;
          }
          if (toolCall.function?.arguments) {
            accumulatedToolCalls[toolIndex].function.arguments += toolCall.function.arguments;
          }
        });
      }
    }
    

    // Send reasoning end event
    if (accumulatedContent) {
      res.write(`data: ${JSON.stringify({ type: 'reasoning_end', iteration: iter, timestamp: Date.now() })}\n\n`);
    }

    // Filter out empty tool calls and ensure they have valid IDs
    const validToolCalls = accumulatedToolCalls.filter(call => call && call.id && call.function?.name);
    
    msg = { 
      content: accumulatedContent || null, 
      tool_calls: validToolCalls.length > 0 ? validToolCalls : undefined 
    };
    toolCalls = msg.tool_calls || [];

    // Structured loop log
    emitProgress(undefined, { phase: 'loop', iter, tool_calls: toolCalls.length || 0, latency_ms: Date.now() - t0, done: toolCalls.length === 0 });

    // Reflect assistant decision on stream (no payloads)
    res.write(`data: ${JSON.stringify({ type: 'gpt_response', iteration: iter, content: msg.content || null, tool_calls: toolCalls.map(c => ({ name: c.function?.name })) })}\n\n`);

    // Append assistant turn to history
    if (toolCalls.length > 0) {
      // Assistant decided to call tools: include tool_calls and set content to null
      convo.push({ role: 'assistant', content: null, tool_calls: toolCalls });
    } else {
      // No tools: push a plain assistant message without tool_calls
      convo.push({ role: 'assistant', content: msg.content || '' });
    }

    if (toolCalls.length === 0) {
      // No tools requested → finish loop
      finalAssistantContent = msg.content || '';
      done = true;
      break;
    }

    // Run multiple tool calls in parallel with timeout
    res.write(`data: ${JSON.stringify({ type: 'tool_calls_start', iteration: iter, count: toolCalls.length })}\n\n`);

    const results = await Promise.allSettled(
      toolCalls.map(call => runToolWithTimeout(call, req.user_id, iter, res, req?._ws_for_progress))
    );

    // Append tool messages to history in the same order
    results.forEach((settled, idx) => {
      const call = toolCalls[idx];
      let content = '';
      if (settled.status === 'fulfilled') {
        content = settled.value?.content ?? '';
      } else {
        content = JSON.stringify({ error: settled.reason?.message || 'tool_failed' });
      }
      convo.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call?.function?.name,
        content
      });
    });

    // Iteration continues; model will see tool results next turn
  }

  // If we exited due to cap/timeout without final content, synthesize brief note
  if (!done && finalAssistantContent == null) {
    finalAssistantContent = 'Beklager, jeg måtte stoppe før jeg ble ferdig. Prøv igjen.';
  }

  // Final assistant response: stream tokens as today using a separate call with tool_choice='none'
  let assistantMessage = '';
  try {
    const sanitizedConvoFinal = (function sanitizeMessagesForOpenAI(msgs) {
      try {
        return msgs.map(m => {
          if (m && m.role === 'assistant') {
            if (Array.isArray(m.tool_calls)) {
              if (m.tool_calls.length === 0) {
                const { tool_calls, ...rest } = m;
                return rest;
              }
              return { ...m, content: m.content ?? null };
            }
          }
          return m;
        });
      } catch (_) {
        return msgs;
      }
    })(convo);
    const streamCompletion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: sanitizedConvoFinal,
      tools: chatTools,
      tool_choice: 'none',
      stream: true
    });

    res.write(`data: ${JSON.stringify({ type: 'text_stream_start' })}\n\n`);
    for await (const chunk of streamCompletion) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        assistantMessage += content;
        res.write(`data: ${JSON.stringify({ type: 'text_chunk', content })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ type: 'text_stream_end' })}\n\n`);
  } catch (error) {
    console.error('Final GPT call failed:', error);
    assistantMessage = finalAssistantContent || 'Det oppstod en feil. Prøv igjen litt senere.';
  }

  // Append a fresh view of shifts for UI convenience (unchanged contract)
  const { data: shifts } = await supabase
    .from('user_shifts')
    .select('*')
    .eq('user_id', req.user_id)
    .order('shift_date');

  res.write(`data: ${JSON.stringify({ type: 'shifts_update', shifts: shifts || [] })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'complete', assistant: assistantMessage, shifts: shifts || [] })}\n\n`);
  res.write('data: [DONE]\n\n');
}

// WebSocket chat message handler
async function handleWebSocketChat(ws, userId, message) {
  try {
    const { messages, currentMonth, currentYear } = message;
    
    if (!openai) {
      ws.send(JSON.stringify({ type: 'error', message: 'OpenAI not configured' }));
      return;
    }
    
    if (!Array.isArray(messages) || messages.length === 0) {
      ws.send(JSON.stringify({ type: 'error', message: 'Messages required' }));
      return;
    }
    
    // Create a WebSocket response writer that matches SSE format
  const wsResponse = {
      write: (data) => {
        if (ws.readyState === ws.OPEN) {
          // Parse SSE data format and convert to WebSocket message
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line.length > 6) {
              const jsonData = line.substring(6);
              if (jsonData !== '[DONE]') {
                try {
                  ws.send(jsonData); // Send parsed JSON directly
                } catch (e) {
                  console.error(`[WS] Failed to send message:`, e);
                }
              }
            }
          }
        }
      },
      end: () => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'complete' }));
        }
      }
  };
  
  // Create mock request object for existing chat handler
  const mockReq = {
    user_id: userId,
    body: { messages, stream: true, currentMonth, currentYear },
    user: null, // Could be populated from Supabase if needed
    _ws_for_progress: ws
  };
    
    // Get tools for the user
    const chatTools = getToolsForRequest(mockReq);
    
    // Run the chat logic with WebSocket output
    await handleChatRequest(mockReq, wsResponse, chatTools, ws);
    
  } catch (error) {
    console.error(`[WS] Chat handling error:`, error);
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Chat processing failed' 
      }));
    }
  }
}

// Cleanup inactive WebSocket connections
setInterval(() => {
  const now = Date.now();
  const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  
  for (const [connectionId, connection] of wsConnections.entries()) {
    if (now - connection.lastPing > TIMEOUT_MS) {
      console.log(`[WS] Cleaning up inactive connection: ${connectionId}`);
      connection.ws.close(4003, 'Connection timeout');
      wsConnections.delete(connectionId);
    }
  }
}, 60000); // Check every minute

// Start server (kun når filen kjøres direkte)
const isRunDirectly = (() => {
  try {
    const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
    return fileURLToPath(import.meta.url) === invokedPath;
  } catch {
    return false;
  }
})();

if (isRunDirectly) {
  const PORT = process.env.PORT || 3000;
  
  // Create HTTP server with Express app
  const server = createServer(app);
  
  // Create WebSocket server on the same HTTP server with strict subprotocol negotiation
  const wss = new WebSocketServer({
    server,
    path: '/ws/chat',
    handleProtocols: (protocols, request) => {
      try {
        const offered = Array.isArray(protocols) ? protocols : Array.from(protocols || []);
        console.log('[WS] Offered subprotocols:', offered, 'raw=', request?.headers?.['sec-websocket-protocol'] || '');
        if (offered.includes('jwt')) return 'jwt';
      } catch (e) {
        console.warn('[WS] handleProtocols error:', e?.message || e);
      }
      return false; // reject if 'jwt' not offered
    }
  });

  // WebSocket connection handler
  wss.on('connection', handleWebSocketConnection);

  server.listen(PORT, () => {
    console.log(`✔ Server running → http://localhost:${PORT}`);
    console.log(`✔ WebSocket server running → ws://localhost:${PORT}/ws/chat`);
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
