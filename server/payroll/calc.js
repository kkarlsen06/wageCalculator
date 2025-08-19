// Centralized wage calculation service for employee shifts
// Pure, deterministic functions with no side effects

/**
 * @typedef {('fixed_0_5_over_5_5h'|'none'|'proportional_across_periods'|'from_base_rate')} BreakPolicy
 */

/**
 * @typedef {Object} OrgSettings
 * @property {BreakPolicy} break_policy
 */

/**
 * @typedef {Object} EmployeeShiftRow
 * @property {string|Date} start_time
 * @property {string|Date} end_time
 * @property {number} break_minutes
 * @property {number} hourly_wage_snapshot
 */

function toMinutes(hhmm) {
  if (hhmm instanceof Date) {
    return hhmm.getUTCHours() * 60 + hhmm.getUTCMinutes();
  }
  if (typeof hhmm === 'string') {
    const [h, m] = hhmm.split(':').map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return h * 60 + m;
  }
  return 0;
}

function computeDurationHours(start_time, end_time) {
  const start = toMinutes(start_time);
  let end = toMinutes(end_time);
  if (end < start) end += 24 * 60; // cross-midnight
  if (end === start) end += 24 * 60; // treat as 24h if identical
  const durationMinutes = Math.max(0, end - start);
  return durationMinutes / 60;
}

/**
 * Apply an organization break policy. Returns automatic deduction in hours.
 * @param {number} hours
 * @param {number} breakMinutes
 * @param {BreakPolicy} policy
 * @returns {number}
 */
export function applyBreakPolicy(hours, breakMinutes, policy) {
  // Guard invalid inputs
  const safeHours = typeof hours === 'number' && Number.isFinite(hours) ? hours : 0;
  const _ = breakMinutes; // breakMinutes not used in current policies, reserved for future

  switch (policy) {
    case 'fixed_0_5_over_5_5h': {
      return safeHours > 5.5 ? 0.5 : 0;
    }
    case 'none': {
      return 0;
    }
    case 'proportional_across_periods': {
      // With no wage-period segmentation here, the magnitude equals 30 min when > 5.5h
      return safeHours > 5.5 ? 0.5 : 0;
    }
    case 'from_base_rate': {
      // With no wage-period segmentation here, treat magnitude same as fixed for now
      return safeHours > 5.5 ? 0.5 : 0;
    }
    default: {
      // Unknown policy – act like none
      return 0;
    }
  }
}

/**
 * Calculate authoritative payroll numbers for an employee shift.
 * @param {EmployeeShiftRow} shift
 * @param {OrgSettings} org
 * @returns {{ durationHours: number, paidHours: number, gross: number, breakPolicyUsed: BreakPolicy }}
 */
export function calcEmployeeShift(shift, org) {
  const breakPolicy = org?.break_policy || 'fixed_0_5_over_5_5h';
  const durationHours = computeDurationHours(shift.start_time, shift.end_time);

  const policyDeductionHours = applyBreakPolicy(
    durationHours,
    Number(shift.break_minutes || 0),
    breakPolicy
  );

  const paidHoursRaw = durationHours - (Number(shift.break_minutes || 0) / 60) - policyDeductionHours;
  const paidHours = Math.max(0, paidHoursRaw);
  const gross = paidHours * Number(shift.hourly_wage_snapshot || 0);

  // Round to 2 decimals without mutating inputs
  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    durationHours: round2(durationHours),
    paidHours: round2(paidHours),
    gross: round2(gross),
    breakPolicyUsed: breakPolicy
  };
}

export default {
  applyBreakPolicy,
  calcEmployeeShift
};


