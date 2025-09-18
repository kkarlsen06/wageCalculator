import { DAYS, normalizeDays } from './days.js';

export function formatDayPills(days) {
  const normalized = normalizeDays(days);
  if (normalized.length === 0) return 'Ingen dager';
  if (normalized.length === DAYS.length) return 'Alle dager';
  return normalized
    .map(day => {
      const meta = DAYS.find(item => item.value === day);
      return meta ? meta.name : `Dag ${day}`;
    })
    .join(', ');
}

export function compareRules(a, b) {
  const daysA = normalizeDays(a?.days);
  const daysB = normalizeDays(b?.days);
  const allA = daysA.length === DAYS.length;
  const allB = daysB.length === DAYS.length;
  if (allA && !allB) return -1;
  if (!allA && allB) return 1;

  const minA = daysA.length ? daysA[0] : Number.POSITIVE_INFINITY;
  const minB = daysB.length ? daysB[0] : Number.POSITIVE_INFINITY;
  if (minA !== minB) return minA - minB;

  const fromA = typeof a?.from === 'string' ? a.from : '';
  const fromB = typeof b?.from === 'string' ? b.from : '';
  if (fromA !== fromB) return fromA.localeCompare(fromB);
  return 0;
}

export function sortRules(rules = []) {
  return [...rules].sort(compareRules);
}

export function mutuallyExclusive({ rate, percent }) {
  const hasRate = rate !== undefined && rate !== null && rate !== '';
  const hasPercent = percent !== undefined && percent !== null && percent !== '';

  if (hasRate) {
    return { rate, percent: undefined };
  }

  if (hasPercent) {
    return { rate: undefined, percent };
  }

  return { rate: undefined, percent: undefined };
}
