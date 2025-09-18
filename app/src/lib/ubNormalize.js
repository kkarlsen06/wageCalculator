export function normalizeUb(data){
  if (!data || typeof data !== 'object') return { data, migrated:false };
  if (Array.isArray(data.rules)) return { data, migrated:false };

  const map = [
    ['weekday',[1,2,3,4,5]],
    ['saturday',[6]],
    ['sunday',[7]],
  ];

  const rules = [];
  let touched = false;

  for (const [key, days] of map){
    const arr = Array.isArray(data?.[key]) ? data[key] : [];
    if (!arr.length) continue;
    touched = true;
    for (const x of arr){
      const rule = { days, from:x.from, to:x.to };
      if (x.percent != null) rule.percent = Number(x.percent);
      else if (x.rate != null) rule.rate = Number(x.rate);
      else continue;
      rules.push(rule);
    }
  }

  if (!touched) return { data, migrated:false };

  const next = { ...data, rules };
  delete next.weekday; delete next.saturday; delete next.sunday;
  return { data: next, migrated:true };
}
