// Fusion d'historiques (local + serveur) : dernière modification gagne,
// les suppressions sont propagées par un registre { id: horodatage }.
const ts = c => new Date(c?.updatedAt || c?.createdAt || 0).getTime()

export function mergeHistories(local = [], remote = [], deletedLocal = {}, deletedRemote = {}, max = 50) {
  const deleted = { ...deletedRemote }
  for (const [id, t] of Object.entries(deletedLocal)) deleted[id] = Math.max(deleted[id] || 0, t)
  const byId = new Map()
  for (const c of [...remote, ...local]) {
    if (!c || !c.id || !Array.isArray(c.messages)) continue
    if (deleted[c.id] && deleted[c.id] >= ts(c)) continue
    const cur = byId.get(c.id)
    if (!cur || ts(c) >= ts(cur)) byId.set(c.id, c)
  }
  const list = [...byId.values()].sort((a, b) => ts(b) - ts(a)).slice(0, max)
  const cutoff = Date.now() - 90 * 864e5
  for (const [id, t] of Object.entries(deleted)) if (t < cutoff) delete deleted[id]
  return { conversations: list, deleted }
}
