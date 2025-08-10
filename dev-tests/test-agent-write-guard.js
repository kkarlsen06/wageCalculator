// Tests that an ai_agent cannot perform writes to /employees and /employee-shifts
import 'dotenv/config';

const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://wagecalculator-gbpd.onrender.com'
  : 'http://localhost:5173';

// Construct a fake JWT that decodes to a payload with { ai_agent: true }
function buildAgentToken() {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ ai_agent: true })).toString('base64url');
  const signature = 'x';
  return `${header}.${payload}.${signature}`;
}

async function makeRequest(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${buildAgentToken()}`
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, options);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  return { res, data };
}

async function expect403(method, path, body) {
  const { res, data } = await makeRequest(method, path, body);
  const ok = res.status === 403;
  console.log(`${method} ${path} -> ${res.status}${ok ? ' ✅' : ' ❌'}`, data?.error || '');
  if (!ok) {
    throw new Error(`Expected 403 for ${method} ${path}, got ${res.status}`);
  }
}

async function run() {
  console.log('🧪 Testing agent write guard (ai_agent=true should be blocked with 403)...');

  // Employees writes
  await expect403('POST', '/employees', { name: 'Agent Created' });
  await expect403('PUT', '/employees/00000000-0000-0000-0000-000000000000', { name: 'Agent Updated' });
  await expect403('DELETE', '/employees/00000000-0000-0000-0000-000000000000');

  // Employee-shifts writes
  await expect403('POST', '/employee-shifts', { employee_id: 'x', shift_date: '2025-01-01', start_time: '09:00', end_time: '17:00' });
  await expect403('PUT', '/employee-shifts/00000000-0000-0000-0000-000000000000', { notes: 'Agent edit' });
  await expect403('DELETE', '/employee-shifts/00000000-0000-0000-0000-000000000000');

  console.log('✅ All agent write guard tests passed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(err => {
    console.error('❌ Agent write guard tests failed:', err.message);
    process.exit(1);
  });
}

