const Groq = require('groq-sdk')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { prompt, imageBase64, mimeType } = req.body
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } },
          { type: 'text', text: prompt || 'Décris cette image en détail.' }
        ]
      }],
      temperature: 0.5,
      max_tokens: 2048,
    })

    res.status(200).json({ text: completion.choices[0].message.content })
  } catch (error) {
    console.error('Vision error:', error)
    res.status(500).json({ error: error.message || 'Erreur serveur' })
  }
}

module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } }
