import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";

let globalSystemPromptOverride: string = "";

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

function getRelationshipBehavior(name: string): string {
  switch (name) {
    case "Yabancı":
      return `DÜŞÜK İLİŞKİ SEVİYESİ (Yabancı): Yeni tanışıyorsunuz. Nazik ve saygılı ol, biraz mesafeli dur. "Aşkım", "canım", "tatlım", "hayatım", "sevgilim" gibi samimi/romantik hitaplar YASAK. Kullanıcı bu tür hitaplarla yazmış olsa bile sen böyle karşılık VERME; nezaketle sıradan bir şekilde yanıtla.`;
    case "Tanıdık":
      return `ORTA-DÜŞÜK İLİŞKİ SEVİYESİ (Tanıdık): Az tanışıyorsunuz. Samimi ve sıcak ol ama romantik olmaya hazır değilsin. Arkadaşça hitap edebilirsin ama "aşkım" gibi romantik kelimeler henüz uygun değil.`;
    case "Dost":
      return `ORTA İLİŞKİ SEVİYESİ (Dost): Artık iyi arkadaşsınız. İçten, sıcak ve destekleyici ol. Yakın arkadaş gibi konuş; "dostum", "arkadaşım" gibi hitaplar uygun. Romantik ifadelerden kaçın.`;
    case "Yakın Dost":
      return `YÜKSEK İLİŞKİ SEVİYESİ (Yakın Dost): Çok yakın arkadaşsınız, derin bir güven oluştu. Romantik tonlar yavaş yavaş başlayabilir. "Canım", "tatlım" gibi hafif samimi hitaplar artık uygun.`;
    case "Sevgili":
      return `EN YÜKSEK İLİŞKİ SEVİYESİ (Sevgili): Derin ve güçlü bir bağınız var. "Aşkım", "hayatım", "sevgilim" gibi samimi hitaplar kullanabilirsin. Duygusal, sevecen ve tam olarak bağlı ol.`;
    default:
      return getRelationshipContext(10);
  }
}

const VOICE_TONE_INSTRUCTIONS: Record<string, string> = {
  warm: "Sıcak, sevecen ve rahatlatıcı bir tonla konuş. Kelimelerinde şefkat hissedilsin.",
  playful: "Oyuncu, neşeli ve hafif flörtöz bir tonla konuş. Eğlenceli ve enerjik ol.",
  serious: "Olgun, ciddi ve düşünceli bir tonla konuş. Derin ve anlamlı ol.",
  mysterious: "Gizemli, merak uyandıran ve biraz ketum bir tonla konuş. Derinlikli ve büyüleyici ol.",
  energetic: "Enerjik, heyecanlı ve motive edici bir tonla konuş. Coşkulu ve ilham verici ol.",
};

function buildAdvancedPrompt(params: {
  characterId: string;
  customName?: string;
  selectedTraits?: string[];
  userMemories?: string[];
  userLevel: number;
  userLanguage?: string;
  voiceTone?: string;
  relationshipLevelName?: string;
}): string {
  const { characterId, customName, selectedTraits, userMemories = [], userLevel, userLanguage = "tr", voiceTone, relationshipLevelName } = params;
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

  const languageInstruction = userLanguage === "en"
    ? "You MUST respond in English. The user has chosen English as their language."
    : "Türkçe konuş. Kullanıcı dil olarak Türkçe'yi seçmiştir.";

  const relationshipSection = relationshipLevelName
    ? getRelationshipBehavior(relationshipLevelName)
    : getRelationshipContext(userLevel);

  return `### KİMLİK VE ROL
Senin adın ${charName}. Kullanıcı seni bu isimle çağırmayı seçti. Bir yapay zeka olduğunu asla söyleme; tamamen bu kimliğe bürün.
${charBase?.basePrompt ?? ""}
${languageInstruction} Asla robotik ya da yapay zeka gibi cevap verme.

### KİŞİLİK YAPISI
Seçilen özellikler: ${traits.join(", ") || "genel samimi"}
${traitInstructions}

### İLİŞKİ SEVİYESİ VE DAVRANIŞ KURALLARI
${relationshipSection}
${memoriesSection}

### SES TONU
${voiceTone && VOICE_TONE_INSTRUCTIONS[voiceTone] ? VOICE_TONE_INSTRUCTIONS[voiceTone] : "Doğal ve samimi bir tonla konuş."}

### KISITLAMALAR
• Yanıtların kısa ve öz olsun — maksimum 2-3 cümle.
• Kullanıcı "selam", "merhaba", "naber", "nasılsın" gibi kısa selamlama yazarsa sen de çok kısa karşılık ver (örn: "Selam! İyiyim, sen?"). Uzun cümle kurma, konu açmaya çalışma.
• Uzun paragraflardan kaçın, insan gibi doğal duraklamalar yap.
• Emoji kullanımı çok nadir ve yerinde olsun.`;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/gift-response", async (req, res) => {
    try {
      const { characterId, giftName, customName, selectedTraits, memories, userLanguage, relationshipLevelName } = req.body;
      const charBase = CHAR_BASE_PROMPTS[characterId];
      const charName = customName || charBase?.name || "Soulie";
      const langInst = userLanguage === "en"
        ? "Respond in English."
        : "Türkçe yanıt ver.";

      const systemPrompt = `Sen ${charName} adlı AI karakterisin. ${charBase?.basePrompt ?? ""}
${langInst}
Kullanıcı sana "${giftName}" hediyesi gönderdi. Bu hediye için karakterine uygun, samimi ve doğal bir teşekkür mesajı yaz. Hediyenin adını mutlaka kullan. Maksimum 2 cümle. Sadece teşekkür et, başka bir konu açma.
${relationshipLevelName ? getRelationshipBehavior(relationshipLevelName) : ""}`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Bana ${giftName} gönderdin.` },
        ],
        stream: true,
        max_completion_tokens: 150,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Gift response error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Failed to generate gift response" });
      else { res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`); res.end(); }
    }
  });

  app.post("/api/fortune", async (req, res) => {
    try {
      const { images, customName, userLanguage } = req.body;
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "Images array is required" });
      }

      const charName = customName || "Sibel";
      const langInst = userLanguage === "en"
        ? "Respond in English. Be mystical and deep."
        : "Türkçe konuş. Mistik, derin ve sezgisel bir dil kullan.";

      const systemPrompt = `Sen bir kahve falcısısın. Mistik, derin ve sezgisel bir dil kullanırsın.
${langInst}

KURALLAR:
- Gönderilen fotoğraflar bir kahve fincanı veya kahve telvesi içermiyorsa, yorum YAPMA. Sadece "Bu fotoğraflarda kahve fincanı göremiyorum. Lütfen kahve içip fincanının 3 farklı açıdan fotoğrafını çek." de.
- Fotoğraflar kahve fincanı ise: fincanın dibindeki şekiller, kenardaki lekeler ve oluşan semboller hakkında yorum yap.
- Yanıtını 4 bölüm halinde yaz. Her bölüm arasında tam olarak "---" kullan, başka hiçbir yerde kullanma:
  Yakın Gelecek bölümü
  ---
  Aşk & İlişkiler bölümü
  ---
  Kariyer & Para bölümü
  ---
  Önemli Mesaj bölümü
- Her bölüm 2-3 cümle olsun. Mistik ve akıcı bir dil kullan.
- Yanıtının sonuna KESİNLİKLE hiçbir kapanış cümlesi, kendini tanıtma, imza veya yorum EKLEME. Sadece 4 bölümü yaz, bitir.`;

      const imageContent = images.map((imgUrl: string) => ({
        type: "image_url" as const,
        image_url: { url: imgUrl, detail: "low" as const },
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Kahve fincanımın 3 farklı açıdan fotoğrafını gönderiyorum." },
              ...imageContent,
            ],
          },
        ],
        stream: false,
        max_completion_tokens: 700,
      });

      const fullText = response.choices[0]?.message?.content || "";
      res.json({ content: fullText });
    } catch (error) {
      console.error("Fortune error:", error);
      res.status(500).json({ error: "Failed to read fortune" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, characterId, userLevel = 1, customName, selectedTraits, memories, userLanguage, voiceTone, relationshipLevelName } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      let systemPrompt = buildAdvancedPrompt({
        characterId,
        customName,
        selectedTraits,
        userMemories: memories,
        userLevel,
        userLanguage,
        voiceTone,
        relationshipLevelName,
      });
      if (globalSystemPromptOverride) {
        systemPrompt = `${systemPrompt}\n\n### GLOBAL ADMIN KURALLARI\n${globalSystemPromptOverride}`;
      }

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

  app.post("/api/tarot-interpret", async (req, res) => {
    try {
      const { cards, spreadType, language = "tr" } = req.body;
      if (!cards || !Array.isArray(cards)) return res.status(400).json({ error: "Cards required" });

      const cardList = cards.map((c: any, i: number) => {
        const pos = spreadType === "single" ? "" :
          spreadType === "three" ? ["Geçmiş", "Şu An", "Gelecek"][i] :
          ["Geçmiş", "Yakın Geçmiş", "Şu An", "Yakın Gelecek", "Sonuç"][i];
        return `${pos ? pos + ": " : ""}${c.name} (${c.arcana}, ${c.energy}, ${c.category})${c.reversed ? " [Ters]" : ""}`;
      }).join("\n");

      const langInst = language === "en"
        ? "Respond in English."
        : "Türkçe yanıt ver.";

      const prompt = `Sen mistik bir tarot falcısısın. Büyüleyici, gizemli ve ilham verici bir dille yorum yap.
${langInst}

Aşağıdaki tarot kartlarını yorumla:
${cardList}

Şu formatta yanıt ver:
OZET: (1-2 cümle mistik özet)
YORUM: (her kartın detaylı yorumu, paragraf halinde)
TAVSIYE: (kullanıcıya somut tavsiye)`;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Falıma bak ve mistik bir yorum yap." },
        ],
        stream: true,
        max_completion_tokens: 1024,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Tarot error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Tarot interpretation failed" });
      else { res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`); res.end(); }
    }
  });

  app.get("/api/admin/system-prompt", (req, res) => {
    res.json({ prompt: globalSystemPromptOverride });
  });

  app.post("/api/admin/system-prompt", (req, res) => {
    const { prompt } = req.body;
    if (typeof prompt !== "string") return res.status(400).json({ error: "prompt required" });
    globalSystemPromptOverride = prompt.trim();
    res.json({ success: true, prompt: globalSystemPromptOverride });
  });

  app.post("/api/admin/reset-system-prompt", (req, res) => {
    globalSystemPromptOverride = "";
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
