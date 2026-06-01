const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, imageBase64, mimeType } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const imagePart = {
      inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' },
    };

    const result = await model.generateContent([prompt || 'Décris cette image en détail.', imagePart]);
    res.status(200).json({ text: result.response.text() });
  } catch (error) {
    console.error('Vision error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}

module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };
