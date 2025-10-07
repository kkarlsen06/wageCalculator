const inflight = new Map();

export function fetchOnce(input, init = {}) {
  const method = (init.method || 'GET').toUpperCase();
  const url = typeof input === 'string'
    ? input
    : input.url ?? String(input);
  const key = `${method} ${url}`;

  if (inflight.has(key)) return inflight.get(key);

  const p = fetch(input, init)
    .then(async (r) => {
      if (!r.ok) throw new Error(`${method} ${r.url} -> ${r.status}`);
      const ct = r.headers.get('content-type') || '';
      return ct.includes('json') ? r.json() : r.text();
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, p);
  return p;
}
