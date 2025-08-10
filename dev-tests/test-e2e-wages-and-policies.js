#!/usr/bin/env node

/**
 * End-to-end scenarios for tariffs, break policy boundaries, snapshot immutability,
 * and agent write-blocking.
 *
 * Requires:
 * - Server running (default http://localhost:5173)
 * - TEST_AUTH_TOKEN env var for an authenticated manager
 */

import 'dotenv/config';

const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://wagecalculator-gbpd.onrender.com'
  : 'http://localhost:5173';

const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function approx(a, b, eps = 1e-2) {
  if (Math.abs(a - b) > eps) {
    throw new Error(`Expected ${a} ≈ ${b} (±${eps})`);
  }
}

async function authed(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* ignore */ }
  return { res, data };
}

async function getOrgSettings() {
  const { res, data } = await authed('GET', '/org-settings');
  return { status: res.status, data };
}

async function setBreakPolicy(policy) {
  const { res, data } = await authed('PUT', '/org-settings', { break_policy: policy });
  return { status: res.status, data };
}

async function createEmployee(body) {
  const { res, data } = await authed('POST', '/employees', body);
  assert(res.status === 201, `Create employee failed: ${res.status} ${JSON.stringify(data)}`);
  return data.employee;
}

async function updateEmployee(id, body) {
  const { res, data } = await authed('PUT', `/employees/${id}`, body);
  assert(res.status === 200, `Update employee failed: ${res.status} ${JSON.stringify(data)}`);
  return data.employee;
}

async function archiveEmployee(id) {
  await authed('DELETE', `/employees/${id}`);
}

async function createEmpShift(body) {
  const { res, data } = await authed('POST', '/employee-shifts', body);
  assert(res.status === 201, `Create employee shift failed: ${res.status} ${JSON.stringify(data)}`);
  return data.shift;
}

async function deleteEmpShift(id) {
  await authed('DELETE', `/employee-shifts/${id}`);
}

async function getEmpShifts(qs = '') {
  const { res, data } = await authed('GET', `/employee-shifts${qs}`);
  assert(res.status === 200, `Get employee shifts failed: ${res.status} ${JSON.stringify(data)}`);
  return data.shifts || [];
}

function todayPlus(days = 0) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0,10);
}

async function testTariffVsCustom() {
  console.log('\n🧪 Tariff vs custom wage snapshots');
  // Ensure no auto-deduction to simplify math
  const put = await setBreakPolicy('none');
  assert(put.status === 200, `Failed to set break policy: ${put.status}`);

  const employeeA = await createEmployee({ name: 'E2E A (custom 200)', hourly_wage: 200.00, tariff_level: 0 });
  const employeeB = await createEmployee({ name: 'E2E B (tariff 3)', tariff_level: 3 });

  const shiftDate = todayPlus(1);
  const aShift = await createEmpShift({ employee_id: employeeA.id, shift_date: shiftDate, start_time: '09:00', end_time: '13:00', break_minutes: 0, notes: 'A custom 4h' });
  const bShift = await createEmpShift({ employee_id: employeeB.id, shift_date: shiftDate, start_time: '14:00', end_time: '18:00', break_minutes: 0, notes: 'B tariff 4h' });

  const shifts = await getEmpShifts(`?from=${shiftDate}&to=${shiftDate}`);
  const gotA = shifts.find(s => s.id === aShift.id);
  const gotB = shifts.find(s => s.id === bShift.id);
  assert(gotA && gotB, 'Expected both shifts present');

  // Verify snapshots and gross math
  assert(gotA.hourly_wage_snapshot === 200, 'Employee A snapshot should be 200');
  approx(gotA.gross, gotA.paid_hours * gotA.hourly_wage_snapshot);

  // Tariff level 3 from code mapping in server.js
  const TARIFF3 = 187.46;
  approx(gotB.hourly_wage_snapshot, TARIFF3);
  approx(gotB.gross, gotB.paid_hours * gotB.hourly_wage_snapshot);

  // Cleanup
  await deleteEmpShift(aShift.id);
  await deleteEmpShift(bShift.id);
  await archiveEmployee(employeeA.id);
  await archiveEmployee(employeeB.id);
  console.log('✅ Tariff vs custom OK');
}

async function testBreakPolicyBoundary() {
  console.log('\n🧪 Break policy boundary (fixed_0_5_over_5_5h vs none)');
  const employee = await createEmployee({ name: 'E2E BreakPolicy Emp', hourly_wage: 200.00, tariff_level: 0 });
  const baseDate = todayPlus(2);

  // Set policy to fixed -> only > 5.5h gets 0.5h deduction
  let put = await setBreakPolicy('fixed_0_5_over_5_5h');
  assert(put.status === 200, 'Failed to set fixed break policy');

  const shift55 = await createEmpShift({ employee_id: employee.id, shift_date: baseDate, start_time: '09:00', end_time: '14:30', break_minutes: 0, notes: '5.5h' });
  const shift551 = await createEmpShift({ employee_id: employee.id, shift_date: baseDate, start_time: '09:00', end_time: '14:31', break_minutes: 0, notes: '5.51h' });

  let shifts = await getEmpShifts(`?from=${baseDate}&to=${baseDate}`);
  const got55 = shifts.find(s => s.id === shift55.id);
  const got551 = shifts.find(s => s.id === shift551.id);
  assert(got55 && got551, 'Expected both boundary shifts present');

  approx(got55.paid_hours, 5.5); // no deduction at exactly 5.5h
  approx(got551.paid_hours, 5.02, 0.01); // 5.5167h - 0.5h => ~5.0167 -> 5.02 after rounding
  assert(got55.break_policy_used === 'fixed_0_5_over_5_5h', 'Policy label mismatch');

  // Switch to none -> both no deduction
  put = await setBreakPolicy('none');
  assert(put.status === 200, 'Failed to set none break policy');

  shifts = await getEmpShifts(`?from=${baseDate}&to=${baseDate}`);
  const got55b = shifts.find(s => s.id === shift55.id);
  const got551b = shifts.find(s => s.id === shift551.id);
  approx(got55b.paid_hours, 5.5);
  approx(got551b.paid_hours, 5.52, 0.01);
  assert(got55b.break_policy_used === 'none', 'Expected policy none after switch');

  // Cleanup
  await deleteEmpShift(shift55.id);
  await deleteEmpShift(shift551.id);
  await archiveEmployee(employee.id);
  console.log('✅ Break policy boundary OK');
}

async function testSnapshotImmutability() {
  console.log('\n🧪 Snapshot immutability across employee tariff changes');
  const employee = await createEmployee({ name: 'E2E Snapshot Emp', tariff_level: 3 });
  const d1 = todayPlus(3);
  const d2 = todayPlus(4);

  // Create baseline shift at level 3
  const s1 = await createEmpShift({ employee_id: employee.id, shift_date: d1, start_time: '09:00', end_time: '13:00', break_minutes: 0 });
  let rows = await getEmpShifts(`?from=${d1}&to=${d1}`);
  const first = rows.find(r => r.id === s1.id);
  assert(first, 'Missing first shift');
  const snap1 = first.hourly_wage_snapshot;

  // Change employee tariff level
  await updateEmployee(employee.id, { tariff_level: 4 });

  // New shift should use new rate; old shift unchanged
  const s2 = await createEmpShift({ employee_id: employee.id, shift_date: d2, start_time: '14:00', end_time: '18:00', break_minutes: 0 });
  rows = await getEmpShifts(`?from=${d2}&to=${d2}`);
  const second = rows.find(r => r.id === s2.id);
  assert(second, 'Missing second shift');

  // From server.js PRESET_WAGE_RATES mapping
  const T3 = 187.46;
  const T4 = 193.05;
  approx(snap1, T3);
  approx(second.hourly_wage_snapshot, T4);

  // Old shift (re-fetch to be sure) remains same
  rows = await getEmpShifts(`?from=${d1}&to=${d1}`);
  const firstAgain = rows.find(r => r.id === s1.id);
  approx(firstAgain.hourly_wage_snapshot, T3);

  // Cleanup
  await deleteEmpShift(s1.id);
  await deleteEmpShift(s2.id);
  await archiveEmployee(employee.id);
  console.log('✅ Snapshot immutability OK');
}

// Agent write-block quick smoke (403 + metrics/audit are covered in separate test file too)
async function testAgentWriteBlock() {
  console.log('\n🧪 Agent write-block (403 on writes)');
  // Build token with ai_agent=true; No signature needed because middleware reads payload only
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ ai_agent: true })).toString('base64url');
  const token = `${header}.${payload}.x`;

  async function expect403(method, path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined
    });
    assert(res.status === 403, `${method} ${path} expected 403, got ${res.status}`);
  }

  await expect403('POST', '/employees', { name: 'Agent' });
  await expect403('PUT', '/employees/00000000-0000-0000-0000-000000000000', { name: 'X' });
  await expect403('DELETE', '/employees/00000000-0000-0000-0000-000000000000');
  await expect403('POST', '/employee-shifts', { employee_id: 'x', shift_date: '2025-01-01', start_time: '09:00', end_time: '17:00' });
  await expect403('PUT', '/employee-shifts/00000000-0000-0000-0000-000000000000', { notes: 'X' });
  await expect403('DELETE', '/employee-shifts/00000000-0000-0000-0000-000000000000');
  console.log('✅ Agent write-block OK');
}

async function run() {
  console.log('🚀 E2E: tariffs, break policy, snapshots, agent guard');

  if (!AUTH_TOKEN) {
    console.warn('⚠️  TEST_AUTH_TOKEN is not set. Authenticated tests will likely fail with 401.');
  }

  // Smoke check server up
  try {
    const { res } = await authed('GET', '/ping');
    assert(res.status === 200, 'Server not responding on /ping');
  } catch (e) {
    console.error('❌ Cannot reach server. Is it running on', API_BASE, '?');
    process.exit(1);
  }

  // Check auth availability; gracefully skip if unauthorized
  try {
    const { res } = await authed('GET', '/org-settings');
    if (res.status === 401) {
      console.log('⚠️  Skipping E2E (requires valid TEST_AUTH_TOKEN for Supabase). Received 401 from /org-settings.');
      process.exit(0);
    }
  } catch (_) {
    // ignore
  }

  try {
    await testTariffVsCustom();
    await testBreakPolicyBoundary();
    await testSnapshotImmutability();
    await testAgentWriteBlock();
    console.log('\n🎉 All E2E scenarios passed');
  } catch (e) {
    console.error('❌ E2E failure:', e.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export { run };


