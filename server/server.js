// ===== server.js =====
console.log('[BOOT] Using server file:', import.meta.url);
console.log('[BOOT] CWD:', process.cwd());

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { calcEmployeeShift } from './payroll/calc.js';
import { randomUUID } from 'node:crypto';
import { verifySupabaseJWT } from './lib/auth/verifySupabaseJwt.js';
// keep legacy alias imports functional
import './lib/verifySupabaseJwt.js';
import { authMiddleware } from './middleware/auth.js';

// ---------- path helpers ----------
const FRONTEND_DIR = __dirname;

// ---------- app & core middleware ----------
const app = express();

// Request logging with Morgan
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false, credentials: true }));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
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

// ---------- dev-only auth debug endpoint ----------
if (process.env.NODE_ENV !== 'production') {
  app.get('/auth/debug', authMiddleware, (req, res) => {
    try {
      const authz = req.headers.authorization || '';
      const userId = req?.auth?.userId || null;
      return res.status(200).json({ ok: true, userId, hasAuthorization: Boolean(authz) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  });
}

// Ensure auth is enforced on key route groups
app.use('/settings', authMiddleware);
app.use('/employees', authMiddleware);
// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

export const admin = supabaseUrl && supabaseSecretKey 
  ? createClient(supabaseUrl, supabaseSecretKey)
  : null;

// Backwards compatibility wrapper
const supabase = (() => {
  if (!supabaseUrl || !supabaseSecretKey) {
    console.warn('[BOOT] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) not set – DB features disabled.');
    return null;
  }
  try {
    return admin;
  } catch (e) {
    console.warn('[BOOT] Failed to initialize Supabase client:', e?.message || e);
    return null;
  }
})();
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
      shift_date: { type: 'string', description: 'YYYY-MM-DD' },
      start_time: { type: 'string', description: 'HH:mm' },
      end_time:   { type: 'string', description: 'HH:mm' },
      employee_id: { type: 'string', description: 'Optional employee ID to assign shift to' }
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
      from:  { type: 'string', description: 'First day YYYY-MM-DD' },
      to:    { type: 'string', description: 'Last day YYYY-MM-DD (inclusive)' },
      days:  { type: 'array',  items: { type: 'integer' }, description: 'Weekdays 0-6' },
      start: { type: 'string', description: 'Shift start HH:mm' },
      end:   { type: 'string', description: 'Shift end   HH:mm' },
      interval_weeks: { type: 'integer', description: 'Interval in weeks (1=every week, 2=every other week, etc.)', default: 1 },
      offset_start: { type: 'integer', description: 'Week offset from start date (0=no offset)', default: 0 }
    },
    required: ['from', 'to', 'days', 'start', 'end']
  }
};

const editShiftSchema = {
  name: 'editShift',
  description: 'Edit an existing work shift. Can identify shift by ID, specific date/time, or natural language (e.g., "tomorrow", "Monday", "next week"). Can update date, start time, end time, or shift type.',
  parameters: {
    type: 'object',
    properties: {
      shift_id: { type: 'integer', description: 'ID of shift to edit (optional if other identifiers provided)' },
      shift_date: { type: 'string', description: 'Specific date of shift to edit YYYY-MM-DD (optional)' },
      start_time: { type: 'string', description: 'Start time of shift to edit HH:mm (optional, used with shift_date)' },
      date_reference: { type: 'string', description: 'Natural language date reference like "tomorrow", "Monday", "next Tuesday", "today" (optional)' },
      time_reference: { type: 'string', description: 'Time reference like "morning shift", "evening shift", or specific time "09:00" (optional)' },
      new_start_time: { type: 'string', description: 'New start time HH:mm (optional)' },
      new_end_time: { type: 'string', description: 'New end time HH:mm (optional)' },
      end_time: { type: 'string', description: 'New end time HH:mm (optional, legacy)' },
      employee_id: { type: 'string', description: 'Optional employee ID to assign shift to' }
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
      shift_date: { type: 'string', description: 'Specific date of shift to delete YYYY-MM-DD (optional)' },
      start_time: { type: 'string', description: 'Start time of shift to delete HH:mm (optional, used with shift_date)' },
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
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD when criteria_type=date_range' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD when criteria_type=date_range' },
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
        description: 'Type of query criteria. Use "week" for current week or "next" for next week.'
      },
      week_number: { type: 'integer', description: 'Week number (1-53) when criteria_type=week. Optional - if not provided, gets current week.' },
      year: { type: 'integer', description: 'Year for week query. Optional - if not provided, gets current week.' },
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD when criteria_type=date_range' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD when criteria_type=date_range' },
      num_weeks: { type: 'integer', description: 'Number of weeks to get when criteria_type=next (default 1)' }
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
      week_number: { type: 'integer', description: 'Week number (1-53). Optional - if not provided, gets current week.' },
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
      month: { type: 'integer', description: 'Month number (1-12). Optional - if not provided, uses current viewing month.' },
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
      from_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
      to_date: { type: 'string', description: 'End date YYYY-MM-DD' }
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

    // Debug logging for wage period calculations
    if (durationHours > 5.5) {
      console.log('Break deduction calculation (server):', {
        shiftId: shift.id,
        method: breakResult.method,
        originalHours: durationHours,
        paidHours: paidHours,
        baseWage: baseWage,
        bonus: bonus,
        total: baseWage + bonus,
        wagePeriods: breakResult.auditTrail?.wagePeriods
      });
    }
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


// Decode JWT payload from Authorization header (to read custom claims like ai_agent)
function getJwtPayloadFromAuthHeader(req) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7);
    const parts = token.split('.');
    if (parts.length < 2) return null;
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
    console.log(`[route] GET /settings authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'}`);
  } catch (_) {}
  try {
    const userId = req?.auth?.userId || req?.user_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { data, error } = await supabase
      .from('user_settings')
      .select('hourly_rate, profile_picture_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // If column missing, degrade gracefully
      const isMissingColumn = (error?.message || '').includes('profile_picture_url') || (error?.code === '42703');
      if (!isMissingColumn) {
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }
    }

    return res.json({
      hourly_rate: data?.hourly_rate ?? 0,
      profile_picture_url: data?.profile_picture_url ?? null
    });
  } catch (e) {
    console.error('GET /settings error:', e);
    return res.status(200).json({ hourly_rate: 0, profile_picture_url: null });
  }
});

app.put('/settings', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    console.log(`[route] PUT /settings authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'}`);
  } catch (_) {}
  try {
    if (isAiAgent(req)) {
      recordAgentDeniedAttempt(req, 'agent_write_blocked_middleware', 403);
      incrementAgentWriteDenied('/settings', 'PUT', 'agent_write_blocked_middleware');
      return res.status(403).json({ error: 'Agent writes are not allowed' });
    }

    const { hourly_rate, profile_picture_url } = req.body || {};

    if (hourly_rate !== undefined && hourly_rate !== null && (typeof hourly_rate !== 'number' || Number.isNaN(hourly_rate))) {
      return res.status(400).json({ error: 'hourly_rate must be a number' });
    }
    if (profile_picture_url !== undefined && profile_picture_url !== null && typeof profile_picture_url !== 'string') {
      return res.status(400).json({ error: 'profile_picture_url must be a string or null' });
    }

    const userId = req?.auth?.userId || req?.user_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const payload = { user_id: userId };
    if (hourly_rate !== undefined) payload.hourly_rate = hourly_rate;
    if (profile_picture_url !== undefined) payload.profile_picture_url = profile_picture_url;

    let data = null; let error = null;
    try {
      const upsert = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select('hourly_rate, profile_picture_url')
        .single();
      data = upsert.data; error = upsert.error;
    } catch (e) {
      error = e;
    }

    if (error) {
      const msg = (error?.message || '').toString();
      const isMissingColumn = msg.includes('profile_picture_url') || (error?.code === '42703');
      if (isMissingColumn) {
        // Retry without profile_picture_url when column missing
        const retryPayload = { user_id: userId };
        if (hourly_rate !== undefined) retryPayload.hourly_rate = hourly_rate;
        const retry = await supabase
          .from('user_settings')
          .upsert(retryPayload, { onConflict: 'user_id' })
          .select('hourly_rate')
          .single();
        return res.json({ hourly_rate: retry.data?.hourly_rate ?? 0, profile_picture_url: null });
      }
      console.error('PUT /settings error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }

    return res.json({
      hourly_rate: data?.hourly_rate ?? 0,
      profile_picture_url: data?.profile_picture_url ?? null
    });
  } catch (e) {
    console.error('PUT /settings exception:', e);
    return res.status(500).json({ error: 'Internal server error' });
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

// ---------- /chat ----------
app.post('/chat', authenticateUser, async (req, res) => {
  const { messages, stream = false, currentMonth, currentYear } = req.body;

  // Get user message first for system prompt customization
  const userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

  // Get user information for personalization (already verified by authenticateUser middleware)
  const user = req.user;

  // Choose tool allowlist based on whether this is an AI agent request
  const chatTools = getToolsForRequest(req);
  let userName = 'bruker';
  if (user) {
    userName = user.user_metadata?.first_name ||
               user.email?.split('@')[0] ||
               'bruker';
  }

  // Inject relative dates and user name for GPT context
  const today = new Date().toLocaleDateString('no-NO', { timeZone: 'Europe/Oslo' });
  const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString('no-NO', { timeZone: 'Europe/Oslo' });

  // Get current viewing context from frontend (defaults to current month/year if not provided)
  const viewingMonth = currentMonth || new Date().getMonth() + 1;
  const viewingYear = currentYear || new Date().getFullYear();
  const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  const viewingMonthName = monthNames[viewingMonth - 1];

  // Create a more specific system prompt based on the user message
  let systemContent = `For konteksten: "i dag" = ${today}, "i morgen" = ${tomorrow}. Brukerens navn er ${userName}.

VIKTIG KONTEKST: Brukeren ser på ${viewingMonthName} ${viewingYear} i grensesnittet.
Når brukeren sier "denne måneden" eller "inneværende måned", mener de ${viewingMonthName} ${viewingYear}.
Når brukeren sier "forrige måned", mener de måneden før ${viewingMonthName} ${viewingYear}.
Når brukeren sier "neste måned", mener de måneden etter ${viewingMonthName} ${viewingYear}.

ABSOLUTT KRITISK - MULTIPLE TOOL CALLS REGEL:
Når brukeren ber om flere operasjoner i SAMME melding, MÅ du utføre ALLE operasjonene i SAMME respons med flere tool_calls. Dette er OBLIGATORISK, ikke valgfritt!`;

  // Add specific instructions for common patterns
  if (userMessage.includes('vis') && userMessage.includes('endre')) {
    systemContent += `

SPESIFIKK INSTRUKSJON for din forespørsel:
Du skal gjøre NØYAKTIG disse to tool calls i denne rekkefølgen:
1. getShifts({"criteria_type": "week"}) - for å hente vaktene
2. editShift({"date_reference": "Friday", "new_start_time": "15:00"}) - for å endre fredagsvakten

IKKE gjør getShifts to ganger! IKKE spør om bekreftelse! Gjør begge operasjonene nå!`;
  } else if (userMessage.includes('måneden') || userMessage.includes('august') || userMessage.includes('måned')) {
    // Use the viewing context month instead of current month
    const firstDay = new Date(viewingYear, viewingMonth - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(viewingYear, viewingMonth, 0).toISOString().slice(0, 10);

    systemContent += `

SPESIFIKK INSTRUKSJON for månedlig spørring:
Bruk getWageDataByMonth() for å hente detaljerte lønnsdata for ${viewingMonthName} ${viewingYear}, eller
getShifts({"criteria_type": "date_range", "from_date": "${firstDay}", "to_date": "${lastDay}"}) for enklere vaktliste.
Du KAN absolutt hente vakter for hele måneder - ikke si at det ikke er mulig!

TILGJENGELIGE FUNKSJONER for lønnsdata:
- getWageDataByWeek() - detaljerte lønnsdata for en uke
- getWageDataByMonth() - detaljerte lønnsdata for en måned
- getWageDataByDateRange(from_date, to_date) - detaljerte lønnsdata for egendefinert periode
- getShifts() - enklere vaktliste uten lønnsberegninger`;
  }

  const systemContextHint = {
    role: 'system',
    content: `Du er en vaktplanleggingsassistent. I dag er ${today}, i morgen er ${tomorrow}. Brukerens navn er ${userName}.

VIKTIG KONTEKST: Brukeren ser på ${viewingMonthName} ${viewingYear} i grensesnittet.
- "denne måneden"/"inneværende måned" = ${viewingMonthName} ${viewingYear}
- "forrige måned" = måneden før ${viewingMonthName} ${viewingYear}
- "neste måned" = måneden etter ${viewingMonthName} ${viewingYear}

LØNNSDATA FUNKSJONER:
- getWageDataByWeek() - detaljerte lønnsdata for uke (timer, grunnlønn, tillegg, totalt)
- getWageDataByMonth() - detaljerte lønnsdata for måned (bruker viewing context hvis ikke spesifisert)
- getWageDataByDateRange(from_date, to_date) - detaljerte lønnsdata for periode
- getShifts() - enklere vaktliste med grunnleggende lønnsinfo

${systemContent}

TOOL USAGE:
- getShifts:
  * criteria_type="week" for denne uka
  * criteria_type="next" for neste uke
  * criteria_type="date_range" med from_date og to_date for måneder/perioder (f.eks. "denne måneden", "august", "siste 30 dager")
  * criteria_type="all" for alle vakter
- editShift: bruk date_reference="Friday" for fredagsvakter, eller shift_date + start_time
- Vis datoer som dd.mm.yyyy til brukeren

MÅNEDLIGE SPØRRINGER: For "denne måneden", "august", "hvor mange vakter har jeg denne måneden" osv., bruk getShifts med criteria_type="date_range" og sett from_date til første dag i måneden og to_date til siste dag.

FORMATERING: IKKE bruk bullet points (•) eller nummererte lister (1., 2., 3.). I stedet, bruk linjeskift og fet tekst for å lage lister. Eksempel:
**04.08.2025** fra kl. 17:00 til 23:15
**05.08.2025** fra kl. 16:00 til 23:15
**08.08.2025** fra kl. 16:00 til 23:15

ALDRI gjør samme tool call to ganger med samme parametere! Bruk FORSKJELLIGE tools for FORSKJELLIGE operasjoner!`
  };
  const fullMessages = [systemContextHint, ...messages];

  // Set up streaming if requested
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial status
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Starter GPT-forespørsel' })}\n\n`);
  }

  // First call: Let GPT choose tools - force tool usage for multi-step operations
  const isMultiStep = /\bog\b.*\bog\b|vis.*og.*endre|vis.*og.*slett|vis.*og.*gjør|legg til.*og.*legg til|hent.*og.*endre/.test(userMessage);



  if (!openai) {
    return res.status(503).json({ error: 'OpenAI not configured' });
  }
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: fullMessages,
    tools: chatTools, // tool allowlist based on ai_agent claim
    tool_choice: isMultiStep ? 'required' : 'auto'
  });

  const choice = completion.choices[0].message;

  // Log what GPT decided to do
  console.log('=== GPT RESPONSE ===');
  console.log('Content:', choice.content);
  console.log('Tool calls:', choice.tool_calls?.length || 0);
  if (choice.tool_calls) {
    choice.tool_calls.forEach((call, i) => {
      console.log(`Tool ${i+1}: ${call.function.name}(${call.function.arguments})`);
    });
  }
  console.log('==================');

  if (stream) {
    res.write(`data: ${JSON.stringify({
      type: 'gpt_response',
      content: choice.content,
      tool_calls: choice.tool_calls?.map(call => ({
        name: call.function.name,
        arguments: call.function.arguments
      })) || []
    })}\n\n`);
  }

  if (choice.tool_calls && choice.tool_calls.length > 0) {
    // Handle multiple tool calls
    const toolMessages = [];

    if (stream) {
      res.write(`data: ${JSON.stringify({
        type: 'tool_calls_start',
        count: choice.tool_calls.length,
        message: `Utfører ${choice.tool_calls.length} operasjon${choice.tool_calls.length > 1 ? 'er' : ''}`
      })}\n\n`);
    }

    for (const call of choice.tool_calls) {
      if (stream) {
        res.write(`data: ${JSON.stringify({
          type: 'tool_call_start',
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments),
          message: `Utfører ${call.function.name}`
        })}\n\n`);
      }

      const toolResult = await handleTool(call, req.user_id);

      if (stream) {
        res.write(`data: ${JSON.stringify({
          type: 'tool_call_complete',
          name: call.function.name,
          result: toolResult.substring(0, 200) + (toolResult.length > 200 ? '...' : ''),
          message: `${call.function.name} fullført`
        })}\n\n`);
      }

      toolMessages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.function.name,
        content: toolResult
      });
    }

    // Add tool results to conversation and get GPT's response
    const messagesWithToolResult = [
      ...fullMessages,
      {
        role: 'assistant',
        content: choice.content,
        tool_calls: choice.tool_calls
      },
      ...toolMessages
    ];

    // Second call: Let GPT formulate a user-friendly response with error handling
    // Skip the "generating_response" status message - go directly to streaming

    let assistantMessage = '';
    try {
      if (stream) {
        // Use streaming for the final response
        if (!openai) {
          return res.status(503).json({ error: 'OpenAI not configured' });
        }
        const streamCompletion = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages: messagesWithToolResult,
          tools: chatTools,
          tool_choice: 'none',
          stream: true
        });

        // Send start of text streaming
        res.write(`data: ${JSON.stringify({
          type: 'text_stream_start'
        })}\n\n`);

        for await (const chunk of streamCompletion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            assistantMessage += content;
            // Send each chunk of text
            res.write(`data: ${JSON.stringify({
              type: 'text_chunk',
              content: content
            })}\n\n`);
          }
        }

        // Send end of text streaming
        res.write(`data: ${JSON.stringify({
          type: 'text_stream_end'
        })}\n\n`);

        // Get updated shift list for streaming
        const { data: shifts } = await supabase
          .from('user_shifts')
          .select('*')
          .eq('user_id', req.user_id)
          .order('shift_date');

        // Send shifts update
        res.write(`data: ${JSON.stringify({
          type: 'shifts_update',
          shifts: shifts || []
        })}\n\n`);
      } else {
        // Non-streaming version
        if (!openai) {
          return res.status(503).json({ error: 'OpenAI not configured' });
        }
        const secondCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messagesWithToolResult,
          tools: chatTools,
          tool_choice: 'none'
        });
        assistantMessage = secondCompletion.choices[0].message.content;
      }
    } catch (error) {
      console.error('Second GPT call failed:', error);
      // Fallback message based on tool results
      const hasSuccess = toolMessages.some(msg => msg.content.startsWith('OK:'));
      const hasError = toolMessages.some(msg => msg.content.startsWith('ERROR:'));

      if (hasError) {
        assistantMessage = 'Det oppstod en feil med en av operasjonene. Prøv igjen.';
      } else if (hasSuccess) {
        assistantMessage = 'Operasjonene er utført! 👍';
      } else {
        assistantMessage = 'Operasjonene er utført.';
      }
    }

    // Get updated shift list
    const { data: shifts } = await supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', req.user_id)
      .order('shift_date');

    if (stream) {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        assistant: assistantMessage,
        shifts: shifts || []
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.json({
        assistant: assistantMessage,
        shifts: shifts || []
      });
    }
  } else {
    // No tool call - just return GPT's direct response
    const assistantMessage = choice.content || "Jeg forstod ikke kommandoen.";

    const { data: shifts } = await supabase
      .from('user_shifts')
      .select('*')
      .eq('user_id', req.user_id)
      .order('shift_date');

    if (stream) {
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        assistant: assistantMessage,
        shifts: shifts || []
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.json({
        assistant: assistantMessage,
        shifts: shifts || []
      });
    }
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
    console.log(`[route] GET /employees authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'}`);
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
      console.error('Error fetching employees:', error);
      return res.status(500).json({ error: 'Failed to fetch employees' });
    }

    const normalized = (employees || []).map(emp => ({
      ...emp,
      name: normalizeEmployeeName(emp?.name)
    }));

    res.json({ employees: normalized });
  } catch (e) {
    console.error('GET /employees error:', e);
    res.status(500).json({ error: 'Internal server error' });
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
    console.log(`[route] POST /employees authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'}`);
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
      console.error('Error creating employee:', insertError);
      return res.status(500).json({ error: 'Failed to create employee' });
    }

    res.status(201).json({ employee: newEmployee });
  } catch (e) {
    console.error('POST /employees error:', e);
    res.status(500).json({ error: 'Internal server error' });
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
    console.log(`[route] PUT /employees/:id authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'}`);
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
      console.error('Error updating employee:', updateError);
      return res.status(500).json({ error: 'Failed to update employee' });
    }

    res.json({ employee: updatedEmployee });
  } catch (e) {
    console.error('PUT /employees/:id error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /employees/:id - Soft delete an employee (set archived_at)
 */
app.delete('/employees/:id', async (req, res) => {
  try {
    const authz = req.headers.authorization || '';
    const resolvedUserId = req?.auth?.userId || req?.user_id || null;
    console.log(`[route] DELETE /employees/:id authz=${authz ? 'yes' : 'no'} userId=${resolvedUserId || 'none'}`);
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
      return res.status(403).json({ error: 'Forbidden' });
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
    console.error('DELETE /employees/:id error:', e);
    res.status(500).json({ error: 'Internal server error' });
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

// ---------- employee-shifts CRUD endpoints ----------

// ---- DEBUG: announce registration of /employee-shifts routes ----
console.log('[BOOT] Registering /employee-shifts routes...');

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
      // Validate employee_id if provided
      if (args.employee_id) {
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
            shift_type:  0,
            employee_id: args.employee_id || null
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
      const dates = generateSeriesDates(args.from, args.to, args.days, args.interval_weeks, args.offset_start);
      if (!dates.length) {
        toolResult = JSON.stringify({
          status: 'error',
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: 'Ingen matchende datoer funnet'
        });
      } else {
        const rows = dates.map(d => ({
          user_id:    user_id,
          shift_date: d.toISOString().slice(0, 10),
          start_time: args.start,
          end_time:   args.end,
          shift_type: 0
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
            .select('id, shift_date, start_time, end_time');

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
              shift_summary: summary
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

        // Only update shift_date if it's different from current (and not used for finding)
        if (args.shift_date && args.shift_date !== existingShift.shift_date) {
          updateData.shift_date = args.shift_date;
        }
        if (newStartTime && newStartTime !== existingShift.start_time) {
          updateData.start_time = newStartTime;
        }
        if (newEndTime && newEndTime !== existingShift.end_time) {
          updateData.end_time = newEndTime;
        }
        if (args.employee_id !== undefined) {
          updateData.employee_id = args.employee_id;
        }

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

          // Get employee context for shifts that have employee_id
          const employeeIds = [...new Set(shifts.filter(s => s.employee_id).map(s => s.employee_id))];
          let employeeMap = {};

          if (employeeIds.length > 0) {
            const { data: employees, error: empError } = await supabase
              .from('employees')
              .select('id, name, display_color')
              .eq('manager_id', user_id)
              .in('id', employeeIds)
              .is('archived_at', null);

            if (!empError && employees) {
              employeeMap = employees.reduce((acc, emp) => {
                acc[emp.id] = { id: emp.id, name: normalizeEmployeeName(emp.name), display_color: emp.display_color };
                return acc;
              }, {});
            }
          }

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
              pauseDeducted: calc.pauseDeducted,
              employee: shift.employee_id ? employeeMap[shift.employee_id] || null : null
            };
          });

          // Format shifts for tool content with earnings info
          const formattedShifts = detailedShifts.map(shift => {
            const employeeInfo = shift.employee ? ` [${shift.employee.name}]` : '';
            return `ID:${shift.id} ${shift.date} ${shift.startTime}-${shift.endTime}${employeeInfo} (${shift.paidHours}t, ${shift.totalEarnings}kr)`;
          }).join(', ');

          toolResult = `OK: ${shifts.length} skift funnet for ${criteriaDescription} (${totalHours.toFixed(1)} timer, ${totalEarnings.toFixed(0)}kr totalt). Skift: ${formattedShifts}`;
        }
      }
    }

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

  // Kalkulator app and its assets
  app.use('/kalkulator', express.static(path.join(staticRoot, 'kalkulator')));

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

  // Kalkulator entry (explicit in case directory index is disabled)
  app.get('/kalkulator', (req, res) => {
    res.sendFile(path.join(staticRoot, 'kalkulator', 'index.html'));
  });
}

export default app;

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
  app.listen(PORT, () =>
    console.log(`✔ Server running → http://localhost:${PORT}`)
  );
}