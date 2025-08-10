import assert from 'assert';
import { applyBreakPolicy, calcEmployeeShift } from '../payroll/calc.js';

function approx(a, b, eps = 1e-6) {
  assert(Math.abs(a - b) <= eps, `Expected ${a} ≈ ${b}`);
}

async function run() {
  console.log('🧪 payroll calc tests');

  // Policies
  // 5.5h should NOT deduct; 5.51h should deduct 0.5h
  assert.equal(applyBreakPolicy(5.5, 0, 'fixed_0_5_over_5_5h'), 0);
  assert.equal(applyBreakPolicy(5.51, 0, 'fixed_0_5_over_5_5h'), 0.5);
  assert.equal(applyBreakPolicy(6, 0, 'none'), 0);

  // Tariff vs Custom via snapshot
  const orgNone = { break_policy: 'none' };
  const orgFixed = { break_policy: 'fixed_0_5_over_5_5h' };

  // 6h duration, 30m manual break
  const shift = {
    start_time: '10:00',
    end_time: '16:00',
    break_minutes: 30,
    hourly_wage_snapshot: 200
  };

  const resNone = calcEmployeeShift(shift, orgNone);
  approx(resNone.durationHours, 6);
  approx(resNone.paidHours, 5.5);
  approx(resNone.gross, 1100);
  assert.equal(resNone.breakPolicyUsed, 'none');

  const resFixed = calcEmployeeShift(shift, orgFixed);
  approx(resFixed.durationHours, 6);
  approx(resFixed.paidHours, 5.0);
  approx(resFixed.gross, 1000);
  assert.equal(resFixed.breakPolicyUsed, 'fixed_0_5_over_5_5h');

  // Org override: change policy changes gross
  assert(resFixed.gross !== resNone.gross, 'gross should change when policy changes');

  // Midnight wrap, 22:00-02:00 = 4h
  const nightShift = {
    start_time: '22:00',
    end_time: '02:00',
    break_minutes: 0,
    hourly_wage_snapshot: 300
  };
  const resNight = calcEmployeeShift(nightShift, orgNone);
  approx(resNight.durationHours, 4);
  approx(resNight.paidHours, 4);
  approx(resNight.gross, 1200);

  console.log('✅ all payroll calc tests passed');
}

run().catch((e) => {
  console.error('❌ payroll calc tests failed', e);
  process.exit(1);
});


