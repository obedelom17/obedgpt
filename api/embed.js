const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { texts, query } = req.body;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    if (query && texts) {
      // Semantic search mode: embed query + texts, compute similarity
      const queryEmbedding = await model.embedContent(query);
      const textEmbeddings = await Promise.all(
        texts.map(t => model.embedContent(t))
      );

      const qVec = queryEmbedding.embedding.values;
      const similarities = textEmbeddings.map((e, i) => {
        const tVec = e.embedding.values;
        const dot = qVec.reduce((s, v, j) => s + v * tVec[j], 0);
        const magQ = Math.sqrt(qVec.reduce((s, v) => s + v * v, 0));
        const magT = Math.sqrt(tVec.reduce((s, v) => s + v * v, 0));
        return { text: texts[i], similarity: dot / (magQ * magT) };
      });

      similarities.sort((a, b) => b.similarity - a.similarity);
      res.status(200).json({ results: similarities });
    } else if (texts) {
      // Embed multiple texts
      const embeddings = await Promise.all(
        texts.map(async t => {
          const r = await model.embedContent(t);
          return { text: t, values: r.embedding.values };
        })
      );
      res.status(200).json({ embeddings });
    } else {
      res.status(400).json({ error: 'Fournissez texts et/ou query' });
    }
  } catch (error) {
    console.error('Embed error:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
}
