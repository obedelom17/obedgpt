const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, language, context } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `Tu es un expert développeur. Génère du code propre, commenté et production-ready.
      ${language ? `Langage préféré : ${language}` : ''}
      ${context ? `Contexte du projet : ${context}` : ''}
      Fournis toujours :
      1. Le code complet et fonctionnel
      2. Des commentaires explicatifs
      3. Des exemples d'utilisation si pertinent
      4. Les dépendances nécessaires si besoin`,
    });

    const result = await model.generateContent(prompt);
    res.status(200).json({ text: result.response.text() });
  } catch (error) {
    console.error('Code error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}
