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

  const { image, mimeType } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Kein Bild übergeben.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API-Key fehlt auf dem Server.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType || 'image/jpeg',
                  data: image,
                },
              },
              {
                type: 'text',
                text: `Analysiere dieses Bild und schlage genau 3 Rezepte vor, die mit den sichtbaren Zutaten zubereitet werden können.

Antworte NUR mit einem JSON-Array ohne Markdown-Backticks oder Erklärungen:
[
  {
    "title": "Rezeptname",
    "category": "Kategorie (z.B. Pasta, Salat, Suppe, Pfanne, Auflauf)",
    "time": 25,
    "description": "2-3 ansprechende Sätze über das Gericht, seinen Geschmack und was es besonders macht.",
    "ingredients": ["Zutat 1", "Zutat 2", "Zutat 3", "Zutat 4", "Zutat 5"]
  }
]`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.error?.message || 'Anthropic-Fehler' });
    }

    const data = await response.json();
    const text = data.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const clean = text.replace(/```json|```/g, '').trim();
    const recipes = JSON.parse(clean);

    return res.status(200).json(recipes);
  } catch (err) {
    console.error('Fehler:', err);
    return res.status(500).json({ error: err.message || 'Unbekannter Fehler' });
  }
};
