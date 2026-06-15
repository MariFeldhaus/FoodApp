const { put, head } = require('@vercel/blob');

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

  const { id, recipeIndex, prevVote, vote } = req.body;
  if (!id || /[^a-z0-9]/i.test(id) || typeof recipeIndex !== 'number') {
    return res.status(400).json({ error: 'Ungültige Anfrage.' });
  }
  if (![null, 'heart', 'x'].includes(prevVote) || ![null, 'heart', 'x'].includes(vote)) {
    return res.status(400).json({ error: 'Ungültige Bewertung.' });
  }

  try {
    const blob = await head(`sets/${id}.json`);
    const fileRes = await fetch(blob.url, { cache: 'no-store' });
    if (!fileRes.ok) throw new Error('Set nicht gefunden.');
    const data = await fileRes.json();

    const counts = data.votes[recipeIndex];
    if (!counts) throw new Error('Ungültiger Rezeptindex.');

    if (prevVote === 'heart') counts.heart = Math.max(0, counts.heart - 1);
    if (prevVote === 'x') counts.x = Math.max(0, counts.x - 1);
    if (vote === 'heart') counts.heart += 1;
    if (vote === 'x') counts.x += 1;

    await put(`sets/${id}.json`, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });

    return res.status(200).json({ votes: data.votes });
  } catch (err) {
    console.error('Fehler:', err);
    return res.status(500).json({ error: err.message || 'Unbekannter Fehler' });
  }
};
