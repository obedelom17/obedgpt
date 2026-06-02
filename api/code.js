const Groq = require('groq-sdk')

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { prompt, language, context } = req.body
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Tu es un expert développeur senior. Génère du code propre, commenté et production-ready.
${language ? `Langage : ${language}` : ''}
${context ? `Contexte du projet : ${context}` : ''}
Fournis toujours :
1. Le code complet dans un bloc de code avec le langage spécifié
2. Des commentaires clairs
3. Un exemple d'utilisation si pertinent
4. Les dépendances nécessaires si besoin`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 8192,
    })

    res.status(200).json({ text: completion.choices[0].message.content })
  } catch (error) {
    console.error('Code error:', error)
    res.status(500).json({ error: error.message || 'Erreur serveur' })
  }
}
