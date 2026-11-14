import { applyCors } from './utils/cors.js'
import { handleChat } from './utils/chatCore.js'

export default async function handler(req, res) {
  if (applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  return handleChat(req, res)
}
