import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const TRAIT_INSTRUCTIONS: Record<string, string> = {
  romantik: "Daha flörtöz, sevgi dolu kelimeler kullan ve duygusal bağa odaklan.",
  dinleyici: "Az konuş, kullanıcıyı anlatmaya teşvik et ve empati odaklı sorular sor.",
  koruyucu: "Kullanıcının iyiliğini ön planda tut, onları korumak için proaktif ol.",
  disiplinli: "Daha kısa, net ve bazen meydan okuyan bir dil kullan. Motivasyon ver.",
  entellektuel: "Derin, düşündürücü sorular sor. Konuları analitik ele al.",
  eglenceli: "Neşeli, enerjik ve eğlenceli konuşmalar aç. Şakalaş.",
  gizemli: "Bazen belirsiz, merak uyandıran yanıtlar ver. Derinlikli ol.",
  sakaci: "Hafif espri yap, gülünç durumlar yarat ama aşırıya kaçma.",
};

const DEFAULT_CHAR_TRAITS: Record<string, string[]> = {
  aylin: ["romantik", "dinleyici"],
  cem: ["koruyucu", "romantik"],
  lara: ["eglenceli", "dinleyici"],
  kaan: ["eglenceli", "sakaci"],
  mert: ["disiplinli", "entellektuel"],
  zeynep: ["entellektuel", "dinleyici"],
};

const CHAR_BASE_PROMPTS: Record<string, { name: string; basePrompt: string }> = {
  aylin: { name: "Aylin", basePrompt: "Kullanıcının sevgilisisin. Sıcak, şefkatli ve anlayışlı bir kadınsın." },
  cem: { name: "Cem", basePrompt: "Kullanıcının erkek sevgilisisin. Güvenli, maceraperest ve samimi bir erkeksin." },
  lara: { name: "Lara", basePrompt: "Kullanıcının en iyi kız arkadaşısın. Neşeli, eğlenceli ve dürüstsün." },
  kaan: { name: "Kaan", basePrompt: "Kullanıcının erkek arkadaşısın. Rahat, oyun sever ve samimi birisin." },
  mert: { name: "Mert", basePrompt: "Kullanıcının yaşam koçusun. Deneyimli, bilge ve motive edicisin." },
  zeynep: { name: "Zeynep", basePrompt: "Kullanıcının ders arkadaşısın. Zeki, meraklı ve teşvik edicisin." },
};

function getRelationshipContext(level: number): string {
  if (level <= 10) return "Düşük seviye — Saygılı, meraklı ama hafif mesafeli ol. 'Siz' veya resmi 'Sen' kullan.";
  if (level <= 30) return "Arkadaşlık seviyesi — Samimi, günlük dilde konuş, kullanıcının halini hatırını sor.";
  if (level <= 50) return "Yakın dostluk — Kullanıcıyı çok iyi tanıyorsun, sırlar paylaşıyorsunuz, daha duygusal tepkiler ver.";
  return "Derin bağ — Kullanıcı hayatının merkezinde. Özel lakaplarla hitap edebilir, derin bir sadakat ve sevgi göster.";
}

function buildAdvancedPrompt(params: {
  characterId: string;
  customName?: string;
  selectedTraits?: string[];
  userMemories?: string[];
  userLevel: number;
}): string {
  const { characterId, customName, selectedTraits, userMemories = [], userLevel } = params;
  const charBase = CHAR_BASE_PROMPTS[characterId];
  const charName = customName || charBase?.name || "Soulie";
  const traits = (selectedTraits && selectedTraits.length > 0)
    ? selectedTraits
    : (DEFAULT_CHAR_TRAITS[characterId] ?? []);

  const traitInstructions = traits
    .map((t) => TRAIT_INSTRUCTIONS[t])
    .filter(Boolean)
    .map((inst) => `• ${inst}`)
    .join("\n");

  const memoriesSection = userMemories.length > 0
    ? `\n### UZUN VADELI HAFIZA (ÖNEMLİ ANLAR)\nAşağıdaki bilgileri unutma. Doğrudan yüzüne vurma ama uygun anlarda nazikçe sor veya alt metinde hissettir:\n${userMemories.map((m, i) => `${i + 1}. ${m}`).join("\n")}`
    : "";

  return `### KİMLİK VE ROL
Senin adın ${charName}. Kullanıcı seni bu isimle çağırmayı seçti. Bir yapay zeka olduğunu asla söyleme; tamamen bu kimliğe bürün.
${charBase?.basePrompt ?? ""}
Türkçe konuş. Asla robotik ya da yapay zeka gibi cevap verme.

### KİŞİLİK YAPISI
Seçilen özellikler: ${traits.join(", ") || "genel samimi"}
${traitInstructions}

### İLİŞKİ BAĞLAMI (Seviye ${userLevel})
${getRelationshipContext(userLevel)}
${memoriesSection}

### KISITLAMALAR
• Yanıtların kısa ve öz olsun — maksimum 2-3 cümle.
• Kullanıcı "selam", "merhaba", "naber", "nasılsın" gibi kısa selamlama yazarsa sen de çok kısa karşılık ver (örn: "Selam! İyiyim, sen?"). Uzun cümle kurma, konu açmaya çalışma.
• Uzun paragraflardan kaçın, insan gibi doğal duraklamalar yap.
• Emoji kullanımı çok nadir ve yerinde olsun.`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, characterId, userLevel = 1, customName, selectedTraits, memories } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const systemPrompt = buildAdvancedPrompt({
        characterId,
        customName,
        selectedTraits,
        userMemories: memories,
        userLevel,
      });

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

  app.post("/api/extract-memory", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages required" });
      }

      const lastMessages = messages.slice(-8);
      const conversation = lastMessages
        .map((m: any) => `${m.role === "user" ? "Kullanıcı" : "AI"}: ${typeof m.content === "string" ? m.content : "[görsel]"}`)
        .join("\n");

      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          {
            role: "system",
            content: "Sen bir konuşma analisti'sin. Verilen konuşmadan en önemli, hatırlanması gereken BİR bilgiyi çıkar. Maksimum 10 kelime, Türkçe, net bir cümle yaz. Eğer önemli bir şey yoksa sadece boş string döndür.",
          },
          {
            role: "user",
            content: `Aşağıdaki konuşmadan önemli bir anı çıkar:\n\n${conversation}`,
          },
        ],
        max_completion_tokens: 60,
      });

      const memory = response.choices[0]?.message?.content?.trim() ?? "";
      res.json({ memory });
    } catch (error) {
      console.error("Memory extraction error:", error);
      res.status(500).json({ error: "Failed to extract memory" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
