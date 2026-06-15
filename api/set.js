const { head } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || /[^a-z0-9]/i.test(id)) {
    return res.status(400).json({ error: 'Ungültige ID.' });
  }

  try {
    const blob = await head(`sets/${id}.json`);
    const fileRes = await fetch(blob.url, { cache: 'no-store' });
    if (!fileRes.ok) throw new Error('Set nicht gefunden.');
    const data = await fileRes.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(404).json({ error: 'Rezept-Set nicht gefunden.' });
  }
};
