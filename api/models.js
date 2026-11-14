import { applyCors } from './utils/cors.js'
import { guard, getModels, DEFAULT_MODEL, keyCount, fail } from './utils/groqCore.js'

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (guard(req, res, 'models', 30)) return
  const cache = await getModels()
  res.setHeader('Cache-Control', 'public, max-age=60')
  return res.status(200).json({ models: cache.list, live: cache.live, defaultModel: DEFAULT_MODEL, keys: keyCount() })
}
