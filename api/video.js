const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, videoBase64, mimeType } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const videoPart = {
      inlineData: { data: videoBase64, mimeType: mimeType || 'video/mp4' },
    };

    const userPrompt = prompt || 'Analyse cette vidéo. Décris ce qui se passe, les scènes clés, les personnes présentes, et le contexte général.';
    const result = await model.generateContent([userPrompt, videoPart]);
    res.status(200).json({ text: result.response.text() });
  } catch (error) {
    console.error('Video error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}

module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };
