const Groq = require('groq-sdk')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { audioBase64, mimeType, prompt } = req.body
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // Convert base64 to Buffer then to File-like object
    const buffer = Buffer.from(audioBase64, 'base64')
    const ext = (mimeType || 'audio/mp3').split('/')[1]?.split(';')[0] || 'mp3'
    const filename = `audio.${ext}`

    // Groq SDK accepts a File-like object via toFile helper
    const { toFile } = require('groq-sdk')
    const audioFile = await toFile(buffer, filename, { type: mimeType || 'audio/mp3' })

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'verbose_json',
    })

    // If extra analysis requested, run through LLaMA
    const text = transcription.text
    if (prompt && prompt !== 'Transcris cet audio et fais-en un résumé complet.') {
      const analysis = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Tu analyses des transcriptions audio.' },
          { role: 'user', content: `Transcription :\n\n${text}\n\n---\n${prompt}` }
        ],
        max_tokens: 2048,
      })
      res.status(200).json({
        text: `## Transcription\n\n${text}\n\n## Analyse\n\n${analysis.choices[0].message.content}`,
        transcription: text,
      })
    } else {
      res.status(200).json({ text, transcription: text })
    }
  } catch (error) {
    console.error('Audio error:', error)
    res.status(500).json({ error: error.message || 'Erreur serveur' })
  }
}

module.exports.config = { api: { bodyParser: { sizeLimit: '25mb' } } }
