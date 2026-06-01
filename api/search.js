const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      tools: [{ googleSearch: {} }],
    });

    const result = await model.generateContent(query);
    const response = result.response;
    const text = response.text();

    // Extract grounding metadata (sources)
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = groundingMetadata?.groundingChunks?.map(chunk => ({
      title: chunk.web?.title || '',
      uri: chunk.web?.uri || '',
    })) || [];

    res.status(200).json({ text, sources });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}
