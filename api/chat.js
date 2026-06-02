const Groq = require('groq-sdk')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { messages, systemPrompt } = req.body
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const groqMessages = [
      { role: 'system', content: systemPrompt || "Tu es ObedGPT, un assistant IA intelligent et utile et tu a ete cree par Obed Elom AGBEBAVI. Réponds dans la langue de l'utilisateur. Pour les formules mathématiques, utilise la syntaxe LaTeX : $formule$ pour inline, $$formule$$ pour bloc." },
      ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 4096,
    })

    res.status(200).json({ text: completion.choices[0].message.content })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: error.message || 'Erreur serveur' })
  }
}
