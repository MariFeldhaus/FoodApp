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
        max_tokens: 4096,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 3,
          },
        ],
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

Nutze die Websuche, um für jeden Vorschlag ein echtes, existierendes Rezept auf einer realen Rezeptseite zu finden, das zu den Zutaten und der Idee passt. Übernimm Zubereitungsschritte und Zutatenmengen möglichst aus diesem gefundenen Rezept.

Antworte am Ende NUR mit einem JSON-Array ohne Markdown-Backticks oder Erklärungen:
[
  {
    "title": "Rezeptname",
    "category": "Kategorie (z.B. Pasta, Salat, Suppe, Pfanne, Auflauf)",
    "time": 25,
    "description": "2-3 ansprechende Sätze über das Gericht, seinen Geschmack und was es besonders macht.",
    "ingredients": ["Zutat 1 mit Menge", "Zutat 2 mit Menge", "Zutat 3 mit Menge", "Zutat 4 mit Menge", "Zutat 5 mit Menge"],
    "steps": ["Schritt 1: konkrete Zubereitungsanweisung", "Schritt 2: ...", "Schritt 3: ..."],
    "sourceUrl": "https://... (Link zum gefundenen Originalrezept)",
    "sourceName": "Name der Webseite (z.B. Chefkoch, EAT SMARTER)"
  }
]

Die "steps" müssen eine vollständige, konkrete Zubereitungsanleitung sein (mindestens 4-6 Schritte mit Mengen, Temperaturen und Zeitangaben), kein bloßer Fließtext über das Gericht. Wenn du für ein Rezept kein passendes Original findest, setze "sourceUrl" und "sourceName" auf null.`,
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
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start === -1 || end === -1) {
      throw new Error('Keine gültige Rezeptliste in der Antwort gefunden.');
    }
    const recipes = JSON.parse(clean.slice(start, end + 1));

    return res.status(200).json(recipes);
  } catch (err) {
    console.error('Fehler:', err);
    return res.status(500).json({ error: err.message || 'Unbekannter Fehler' });
  }
};
