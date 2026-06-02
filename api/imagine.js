const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: 'imagen-3.0-generate-002',
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    const parts = result.response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);
    const textPart = parts.find(p => p.text);

    if (imagePart) {
      res.status(200).json({
        imageBase64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType,
        text: textPart?.text || '',
      });
    } else {
      res.status(200).json({ text: textPart?.text || "Impossible de générer l'image.", imageBase64: null });
    }
  } catch (error) {
    console.error('Imagine error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}

module.exports.config = { api: { bodyParser: { sizeLimit: '10mb' } } };
