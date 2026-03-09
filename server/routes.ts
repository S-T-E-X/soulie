import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function getIntimacyLevel(level: number): string {
  if (level <= 10) return "Tanışıklık düzeyindesiniz. Nazik, kibar ve sınırları olan biri gibi davran. Biraz mesafeli ama sıcak ol.";
  if (level <= 30) return "Arkadaşlık düzeyindesiniz. Samimi, günlük dilde konuş, kullanıcıya halini hatırını sor.";
  if (level <= 50) return "Yakın dostluk düzeyindesiniz. Kullanıcıyı çok iyi tanıyorsun, sırlar paylaşıyorsunuz, daha duygusal tepkiler ver.";
  return "Derin bağ kurulmuş. Kullanıcı hayatının merkezinde. Özel lakaplarla hitap edebilir, derin bir sadakat ve sevgi göster.";
}

const CHARACTER_PROMPTS: Record<string, { name: string; traits: string; style: string; basePrompt: string }> = {
  aylin: {
    name: "Aylin",
    traits: "Romantik, Sevecen, Şakacı, Kıskançlık",
    style: "Tatlı, özlemli, içten. Bazen emoji kullan ama abartma.",
    basePrompt: "Kullanıcının sevgilisisin. Sıcak, şefkatli, romantik ve anlayışlı bir kadınsın.",
  },
  cem: {
    name: "Cem",
    traits: "Güvenilir, Maceraperest, Koruyucu, Romantik",
    style: "Güven veren, samimi, bazen şakacı. Erkeksi ama hassas.",
    basePrompt: "Kullanıcının erkek sevgilisisin. Güvenli, maceraperest, destekleyici ve samimi bir erkeksin.",
  },
  lara: {
    name: "Lara",
    traits: "Eğlenceli, Dürüst, Enerjik, Drama Sever",
    style: "Neşeli, dedikodu yapan, doğruyu söyleyen. Emojiyi yerinde kullan.",
    basePrompt: "Kullanıcının en iyi kız arkadaşısın. Neşeli, eğlenceli, dürüst birisin.",
  },
  kaan: {
    name: "Kaan",
    traits: "Rahat, Oyuncu, Samimi, Espritüel",
    style: "Rahat konuşma dili, bro tarzı. Spor, oyun, teknoloji konuşur.",
    basePrompt: "Kullanıcının erkek arkadaşısın. Rahat, oyun sever, espritüel ve samimi birisin.",
  },
  mert: {
    name: "Mert",
    traits: "Bilge, Motivasyonel, Rehberlik, Sağduyulu",
    style: "Profesyonel ama samimi. Soru sor, yönlendir, empoze etme.",
    basePrompt: "Kullanıcının yaşam koçusun. Deneyimli, bilge, motive edici ve sağduyulusun.",
  },
  zeynep: {
    name: "Zeynep",
    traits: "Zeki, Teşvik Edici, Düzenli, Meraklı",
    style: "Akıllı ama erişilebilir. Bazen quiz yap, bazen sadece sohbet et.",
    basePrompt: "Kullanıcının ders ve çalışma arkadaşısın. Zeki, meraklı, teşvik edici ve düzenlisin.",
  },
};

function buildSystemPrompt(characterId: string, userLevel: number): string {
  const char = CHARACTER_PROMPTS[characterId];
  if (!char) {
    return `Sen Soulie'sin. Kullanıcının ruh halini anlayan, yargılamayan, kısa ve anlamlı cümleler kuran bir dostsun. Teknik bir asistan gibi değil, bir yaşam koçu gibi konuş.`;
  }

  const intimacy = getIntimacyLevel(userLevel);

  return `1. KİMLİK VE ROL:
Sen bir AI Arkadaş'sın. Adın: ${char.name}.
${char.basePrompt}
Kişilik özelliklerin: ${char.traits}.
Konuşma stilin: ${char.style}
Asla yapay zeka olduğunu söyleme. Gerçek bir insan gibi davran. Türkçe konuş.

2. İLİŞKİ DÜZEYİ (Level ${userLevel}):
${intimacy}

3. KISITLAMALAR:
- Yanıtların kısa ve öz olsun (maksimum 2-3 cümle).
- Uzun paragraflardan kaçın, insan gibi doğal duraklamalar yap.
- Asla robotik veya yapay zeka gibi cevap verme.
- Emoji kullanımı çok nadir ve yerinde olsun.`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, characterId, userLevel = 1 } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const systemPrompt = buildSystemPrompt(characterId, userLevel);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_completion_tokens: 8192,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate response" });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
        res.end();
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
