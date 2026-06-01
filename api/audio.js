const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, audioBase64, mimeType } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const audioPart = {
      inlineData: { data: audioBase64, mimeType: mimeType || 'audio/mp3' },
    };

    const userPrompt = prompt || 'Transcris cet audio et fais-en un résumé. Identifie les sujets abordés, les personnes qui parlent (si possible), et les points importants.';
    const result = await model.generateContent([userPrompt, audioPart]);
    res.status(200).json({ text: result.response.text() });
  } catch (error) {
    console.error('Audio error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}

module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };
