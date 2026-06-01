const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, systemPrompt } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt || 'Tu es ObedGPT, un assistant IA intelligent, précis et utile. Tu peux répondre en français ou en anglais selon la langue de l\'utilisateur.',
    });

    // Build chat history (exclude last message which is the new user message)
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    const text = result.response.text();

    res.status(200).json({ text });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}
