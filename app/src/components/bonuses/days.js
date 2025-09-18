export const DAYS = [
  { value: 1, short: 'M', name: 'Mandag' },
  { value: 2, short: 'T', name: 'Tirsdag' },
  { value: 3, short: 'O', name: 'Onsdag' },
  { value: 4, short: 'T', name: 'Torsdag' },
  { value: 5, short: 'F', name: 'Fredag' },
  { value: 6, short: 'L', name: 'Lørdag' },
  { value: 7, short: 'S', name: 'Søndag' },
];

export const DAY_VALUES = DAYS.map(day => day.value);

export function normalizeDays(days) {
  if (!Array.isArray(days)) return [];
  const set = new Set();
  for (const raw of days) {
    const value = Number(raw);
    if (!Number.isInteger(value)) continue;
    if (value < 1 || value > 7) continue;
    set.add(value);
  }
  return Array.from(set).sort((a, b) => a - b);
}
