const store = new Map();
const TTL   = 30_000; // 30 seconds

export async function cachedQuery(key, queryFn) {
  const hit = store.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.data;
  const data = await queryFn();
  store.set(key, { data, ts: Date.now() });
  return data;
}

export function invalidate(key) { store.delete(key); }
export function invalidateAll() { store.clear(); }
