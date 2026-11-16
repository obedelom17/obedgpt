// Stockage clé/valeur commun : Cloudflare KV (binding STORE_KV) en priorité,
// sinon Upstash Redis (UPSTASH_REDIS_REST_URL / _TOKEN). Même interface des deux côtés.
const kv = () => globalThis.__CF_ENV?.STORE_KV
const upUrl = () => process.env.UPSTASH_REDIS_REST_URL
const upTok = () => process.env.UPSTASH_REDIS_REST_TOKEN

export const hasStore = () => !!(kv() || (upUrl() && upTok()))

async function redis(cmd) {
  const r = await fetch(upUrl(), { method: 'POST', headers: { Authorization: `Bearer ${upTok()}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) })
  if (!r.ok) throw new Error(`redis ${r.status}`)
  return (await r.json()).result
}

export async function sget(key) {
  if (kv()) return kv().get(key)
  return redis(['GET', key])
}
export async function sset(key, value, { ttl } = {}) {
  if (kv()) return kv().put(key, value, ttl ? { expirationTtl: Math.max(60, ttl) } : undefined)
  return redis(ttl ? ['SET', key, value, 'EX', ttl] : ['SET', key, value])
}
export async function sdel(key) {
  if (kv()) return kv().delete(key)
  return redis(['DEL', key])
}
