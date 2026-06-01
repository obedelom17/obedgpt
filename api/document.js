const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, fileBase64, mimeType } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const filePart = {
      inlineData: { data: fileBase64, mimeType: mimeType || 'application/pdf' },
    };

    const userPrompt = prompt || 'Analyse ce document. Fais un résumé détaillé de son contenu, identifie les points clés, et réponds à toute question posée.';
    const result = await model.generateContent([userPrompt, filePart]);
    res.status(200).json({ text: result.response.text() });
  } catch (error) {
    console.error('Document error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}

module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };
