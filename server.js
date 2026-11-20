import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const RUBRIQUES = {
  film: ["Logline", "Acte 1", "Acte 2", "Acte 3"],
  musique: ["Concept", "Structure", "Son", "Refrain"],
  jeux: ["Concept", "Boucle de jeu", "Mécaniques", "Progression"],
  livre: ["Pitch", "Personnages", "Plan", "Ouverture"],
  education: ["Objectif", "Prérequis", "Modules", "Évaluation"]
};

app.post("/creer", async (req, res) => {
  const { cat, prompt, tone } = req.body || {};
  if (!prompt || !RUBRIQUES[cat]) {
    return res.status(400).json({ error: "Paramètres invalides." });
  }

  const consigne = `Tu es l'assistant créatif d'auraii. À partir de cette idée : "${prompt}" (catégorie : ${cat}, ton : ${tone}), invente un titre court et accrocheur ainsi que 4 rubriques précises nommées exactement : ${RUBRIQUES[cat].join(", ")}. Réponds en français, tout public, de façon inspirante et concise.`;

  try {
    // URL dédiée aux clés Vertex AI Express (commençant par AQ.)
    const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: consigne }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              sections: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    h: { type: "STRING" },
                    p: { type: "STRING" }
                  },
                  required: ["h", "p"]
                }
              }
            },
            required: ["title", "sections"]
          }
        }
      })
    });

    const data = await r.json();

    // Affiche le détail exact dans les Logs Render si Google renvoie une erreur
    if (!r.ok) {
      console.error("Erreur Vertex AI :", JSON.stringify(data));
      return res.status(r.status).json({ error: data?.error?.message || "Erreur Google Cloud" });
    }

    const texte = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texte) return res.status(502).json({ error: "Réponse vide de Gemini." });

    res.json(JSON.parse(texte));
  } catch (err) {
    console.error("Erreur serveur :", err);
    res.status(500).json({ error: "Erreur serveur lors de la génération." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Serveur auraii-api (Vertex AI) prêt sur le port " + PORT));
