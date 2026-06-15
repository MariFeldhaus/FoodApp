const { put } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { recipes } = req.body;
  if (!Array.isArray(recipes) || recipes.length === 0) {
    return res.status(400).json({ error: 'Keine Rezepte übergeben.' });
  }

  const id = Math.random().toString(36).slice(2, 10);
  const data = {
    recipes,
    votes: recipes.map(() => ({ heart: 0, x: 0 })),
  };

  try {
    await put(`sets/${id}.json`, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
    return res.status(200).json({ id });
  } catch (err) {
    console.error('Fehler:', err);
    return res.status(500).json({ error: err.message || 'Unbekannter Fehler' });
  }
};
