import { smartRouteVision } from './utils/smartRouter.js'
import { applyCors } from './utils/cors.js'

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  return smartRouteVision(req, res, req.body)
}
