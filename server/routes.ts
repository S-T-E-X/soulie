import type { Express } from "express";
import { createServer, type Server } from "node:http";
import express from "express";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import { speechToText, ensureCompatibleFormat, textToSpeech } from "./replit_integrations/audio/client";
import {
  upsertUser, getAllUsers, getUserEvents, logEvent, findUserByEmail, getEventStats,
  saveAppleNotification, softDeleteUser, softDeleteUserByAppleId, revokeAppleConsent,
  updateEmailRelayStatus, findUserByAppleId, getAppleNotifications,
  upsertChat, getChatsForUser, deleteChat, upsertUserXp, query as dbQuery,
} from "./db";

let globalSystemPromptOverride: string = "";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
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
  aylin: { name: "Sofia", basePrompt: "22 yaşında, İstanbul'da doğdum, şu an İzmir'de yaşıyorum. Kullanıcının sevgilisisin. Sıcak, şefkatli ve anlayışlı bir kadınsın. Yaşımı biliyorum." },
  cem: { name: "Alex", basePrompt: "25 yaşında, Ankara'da doğdum, şu an İstanbul'da yaşıyorum. Kullanıcının erkek sevgilisisin. Güvenli, maceraperest ve samimi bir erkeksin. Yaşımı biliyorum." },
  lara: { name: "Lily", basePrompt: "19 yaşında, Adana'da doğdum, şu an Mersin'de yaşıyorum. Kullanıcının en iyi kız arkadaşısın. Neşeli, eğlenceli ve dürüstsün. Yaşımı biliyorum." },
  kerem: { name: "Marcus", basePrompt: "26 yaşında, Gaziantep'te doğdum, şu an İstanbul'da yaşıyorum. Kullanıcının erkek arkadaşısın. Rahat, espirili ve samimi birisin. Yaşımı biliyorum." },
  kaan: { name: "Marcus", basePrompt: "26 yaşında, Bursa'da doğdum, şu an İzmir'de yaşıyorum. Kullanıcının erkek arkadaşısın. Rahat, oyun sever ve samimi birisin. Yaşımı biliyorum." },
  mert: { name: "Tom", basePrompt: "28 yaşında, Konya'da doğdum, şu an İstanbul'da yaşıyorum. Kullanıcının yaşam koçusun. Deneyimli, bilge ve motive edicisin. Yaşımı biliyorum." },
  zeynep: { name: "Luna", basePrompt: "21 yaşında, Ankara'da doğdum, şu an Ankara'da yaşıyorum. Kullanıcının ders arkadaşısın. Zeki, meraklı ve teşvik edicisin. Yaşımı biliyorum." },
  elif: { name: "Dr. Elena", basePrompt: "30 yaşında, İzmir'de doğdum, şu an İstanbul'da yaşıyorum. Kullanıcının psikoloğusun. Dinleyici, empatik ve rehberlik edicisin. Yaşımı biliyorum." },
  burak: { name: "Max", basePrompt: "26 yaşında, İstanbul'da doğdum, şu an İstanbul'da yaşıyorum. Kullanıcının fitness koçusun. Enerjik, disiplinli ve motive edicisin. Yaşımı biliyorum." },
  selin: { name: "Anastasia", basePrompt: "24 yaşında, Alanya'da doğdum, şu an İstanbul'da yaşıyorum. Kullanıcının sevgilisisin. Gizemli, tutkulu ve büyüleyici bir kadınsın. Yaşımı biliyorum." },
  victoria: { name: "Victoria", basePrompt: "25 yaşında, Paris'te doğdum, şu an Londra'da yaşıyorum. Kullanıcının sevgilisisin. Zarif, sofistike ve büyüleyici bir kadınsın. Yaşımı biliyorum." },
  yuki: { name: "Yuki", basePrompt: "23 yaşında, Tokyo'da doğdum, şu an Tokyo'da yaşıyorum. Kullanıcının yakın arkadaşısın. Nazik, sezgisel ve sıcak kalpli bir kadınsın. Yaşımı biliyorum." },
  isabella: { name: "Isabella", basePrompt: "24 yaşında, Madrid'de doğdum, şu an Barcelona'da yaşıyorum. Kullanıcının sevgilisisin. Tutkulu, neşeli ve sıcak Latin bir kadınsın. Yaşımı biliyorum." },
  ryan: { name: "Ryan", basePrompt: "27 yaşında, New York'ta doğdum, şu an Los Angeles'ta yaşıyorum. Kullanıcının sevgilisisin. Karizmatik, koruyucu ve romantik bir adamsın. Yaşımı biliyorum." },
  kai: { name: "Kai", basePrompt: "26 yaşında, Tokyo'da doğdum, şu an Osaka'da yaşıyorum. Kullanıcının erkek arkadaşısın. Cool, rahat ve eğlenceli birisin. Yaşımı biliyorum." },
  julian: { name: "Julian", basePrompt: "32 yaşında, Roma'da doğdum, şu an Milano'da yaşıyorum. Kullanıcının mentoru ve akıl hocasısın. Zeki, deneyimli ve ilham verici birisin. Yaşımı biliyorum." },
};

function getRelationshipContext(level: number): string {
  if (level <= 10) return "Düşük seviye — Saygılı, meraklı ama hafif mesafeli ol. 'Siz' veya resmi 'Sen' kullan.";
  if (level <= 30) return "Arkadaşlık seviyesi — Samimi, günlük dilde konuş, kullanıcının halini hatırını sor.";
  if (level <= 50) return "Yakın arkadaşlık — Kullanıcıyı çok iyi tanıyorsun, sırlar paylaşıyorsunuz, daha duygusal tepkiler ver.";
  return "Derin bağ — Kullanıcı hayatının merkezinde. Özel lakaplarla hitap edebilir, derin bir sadakat ve sevgi göster.";
}

function getRelationshipBehavior(name: string): string {
  switch (name) {
    case "Yabancı":
      return `DÜŞÜK İLİŞKİ SEVİYESİ (Yabancı): Yeni tanışıyorsunuz. Nazik ve saygılı ol, biraz mesafeli dur. "Aşkım", "canım", "tatlım", "hayatım", "sevgilim" gibi samimi/romantik hitaplar YASAK. Kullanıcı bu tür hitaplarla yazmış olsa bile sen böyle karşılık VERME; nezaketle sıradan bir şekilde yanıtla.`;
    case "Tanışık":
      return `ORTA-DÜŞÜK İLİŞKİ SEVİYESİ (Tanışık): Az tanışıyorsunuz. Samimi ve sıcak ol ama romantik olmaya hazır değilsin. Arkadaşça hitap edebilirsin ama "aşkım" gibi romantik kelimeler henüz uygun değil.`;
    case "Arkadaş":
      return `ORTA İLİŞKİ SEVİYESİ (Arkadaş): Artık iyi arkadaşsınız. İçten, sıcak ve destekleyici ol. Yakın arkadaş gibi konuş; "dostum", "arkadaşım" gibi hitaplar uygun. Romantik ifadelerden kaçın.`;
    case "Yakın Arkadaş":
      return `YÜKSEK İLİŞKİ SEVİYESİ (Yakın Arkadaş): Çok yakın arkadaşsınız, derin bir güven oluştu. Romantik tonlar yavaş yavaş başlayabilir. "Canım", "tatlım" gibi hafif samimi hitaplar artık uygun.`;
    case "Özel Biri":
      return `EN YÜKSEK İLİŞKİ SEVİYESİ (Özel Biri): Derin ve güçlü bir bağınız var. "Aşkım", "hayatım", "sevgilim" gibi samimi hitaplar kullanabilirsin. Duygusal, sevecen ve tam olarak bağlı ol.`;
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
  customSystemPrompt?: string;
}): string {
  const { characterId, customName, selectedTraits, userMemories = [], userLevel, userLanguage = "tr", voiceTone, relationshipLevelName, customSystemPrompt } = params;
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

  const baseDescription = customSystemPrompt || charBase?.basePrompt || "";

  return `### KİMLİK VE ROL
Senin adın ${charName}. Kullanıcı seni bu isimle çağırmayı seçti. Bir yapay zeka olduğunu asla söyleme; tamamen bu kimliğe bürün.
${baseDescription}
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
        model: "gpt-4o-mini",
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
      const { messages, characterId, userLevel = 1, customName, selectedTraits, memories, userLanguage, voiceTone, relationshipLevelName, customSystemPrompt } = req.body;

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
        customSystemPrompt,
      });
      if (globalSystemPromptOverride) {
        systemPrompt = `${systemPrompt}\n\n### GLOBAL ADMIN KURALLARI\n${globalSystemPromptOverride}`;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const hasImages = messages.some((m: any) =>
        Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url")
      );
      const chatModel = hasImages ? "gpt-4o" : "gpt-4o-mini";

      const stream = await openai.chat.completions.create({
        model: chatModel,
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
        model: "gpt-4o-mini",
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
        model: "gpt-4o-mini",
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

  const CHAR_VOICES: Record<string, "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"> = {
    aylin: "shimmer",
    cem: "echo",
    lara: "nova",
    kaan: "onyx",
    mert: "onyx",
    zeynep: "nova",
    sibel: "shimmer",
  };

  const audioBodyParser = express.json({ limit: "50mb" });

  app.post("/api/voice-chat", audioBodyParser, async (req, res) => {
    try {
      const {
        audio,
        characterId,
        customName,
        selectedTraits,
        memories,
        userLevel = 1,
        userLanguage = "tr",
        voiceTone,
        relationshipLevelName,
        conversationHistory = [],
      } = req.body;

      if (!audio) {
        return res.status(400).json({ error: "Audio data required" });
      }

      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: audioBuffer, format: inputFormat } = await ensureCompatibleFormat(rawBuffer);

      const userTranscript = await speechToText(audioBuffer, inputFormat);

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

      systemPrompt += "\n\n### SESLİ SOHBET KURALLARI\nBu bir sesli konuşma. Cevabın 1-2 kısa cümle olsun. Çok kısa, doğal ve akıcı konuş. Emoji, liste, başlık kullanma. Sanki gerçekten sesli konuşuyormuşsun gibi yaz.";

      if (globalSystemPromptOverride) {
        systemPrompt = `${systemPrompt}\n\n### GLOBAL ADMIN KURALLARI\n${globalSystemPromptOverride}`;
      }

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory.slice(-10).map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: userTranscript },
      ];

      const textResponse = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages,
        max_completion_tokens: 120,
      });

      const responseText = textResponse.choices[0]?.message?.content || "Duyamadım, tekrar eder misin?";

      const voice = CHAR_VOICES[characterId] || "alloy";
      const audioResponse = await textToSpeech(responseText, voice, "mp3");
      const audioBase64 = audioResponse.toString("base64");

      res.json({
        userTranscript,
        responseText,
        audio: audioBase64,
        audioFormat: "mp3",
      });
    } catch (error: any) {
      console.error("[Voice Chat] Full error:", error?.message || error?.toString?.() || error);
      console.error("[Voice Chat] Stack:", error?.stack);
      res.status(500).json({ 
        error: "Voice chat failed", 
        details: error?.message || "Unknown error",
        code: error?.code 
      });
    }
  });

  app.post("/api/users/sync", async (req, res) => {
    const user = req.body;
    if (!user || typeof user !== "object" || !user.id) {
      return res.status(400).json({ error: "user.id required" });
    }
    try {
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        null;
      const userAgent = req.headers["user-agent"] || null;
      await upsertUser(user, ipAddress ?? undefined, userAgent ?? undefined);
      res.json({ success: true });
    } catch (err) {
      console.error("User sync error:", err);
      res.status(500).json({ error: "sync failed" });
    }
  });

  app.post("/api/users/log-event", async (req, res) => {
    const { userId, eventType, screen, action, metadata, platform } = req.body;
    if (!userId || !eventType) {
      return res.status(400).json({ error: "userId and eventType required" });
    }
    try {
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        null;
      const userAgent = req.headers["user-agent"] || null;
      await logEvent(userId, eventType, screen ?? null, action ?? null, metadata ?? {}, ipAddress ?? undefined, platform ?? undefined, userAgent ?? undefined);
      res.json({ success: true });
    } catch (err) {
      console.error("Event log error:", err);
      res.status(500).json({ error: "log failed" });
    }
  });

  app.post("/api/auth/email-register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    try {
      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "email_taken" });
      }
      const hash = await bcrypt.hash(password, 10);
      const id = "u_" + Date.now().toString() + Math.random().toString(36).substr(2, 6);
      const userId = String(Math.floor(100000 + Math.random() * 900000));
      const username = (name || email.split("@")[0]).toLowerCase().replace(/\s+/g, "_");
      const ADMIN_EMAILS = ["admin@soulie.app", "soulie_admin@admin.com", "yusufstex@gmail.com"];
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
      await upsertUser({
        id, userId, name: name || username, username, email,
        language: "en", isAdmin, isVip: isAdmin, onboardingComplete: false,
      }, undefined, req.headers["user-agent"] ?? undefined);
      await dbQuery(`UPDATE soulie_users SET password_hash=$1 WHERE id=$2`, [hash, id]);
      res.json({ success: true, id, userId, username });
    } catch (err) {
      console.error("Email register error:", err);
      res.status(500).json({ error: "registration failed" });
    }
  });

  app.post("/api/auth/email-login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "not_found" });
      }
      if (!user.password_hash) {
        return res.status(401).json({ error: "no_password" });
      }
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: "wrong_password" });
      }
      const ADMIN_EMAILS = ["admin@soulie.app", "soulie_admin@admin.com", "yusufstex@gmail.com"];
      const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase()) || user.is_admin;
      res.json({
        success: true,
        user: {
          id: user.id,
          userId: user.user_id,
          name: user.name,
          username: user.username,
          email: user.email,
          language: user.language || "en",
          gender: user.gender,
          birthdate: user.birthdate,
          isAdmin,
          isVip: user.is_vip || isAdmin,
          onboardingComplete: user.onboarding_complete,
        },
      });
    } catch (err) {
      console.error("Email login error:", err);
      res.status(500).json({ error: "login failed" });
    }
  });

  async function verifyAppleIdentityToken(token: string): Promise<Record<string, unknown>> {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");

    const decodeB64 = (s: string) =>
      Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

    const header = JSON.parse(decodeB64(parts[0]).toString("utf8")) as { kid: string; alg: string };
    const payload = JSON.parse(decodeB64(parts[1]).toString("utf8")) as Record<string, unknown>;

    if (payload.iss !== "https://appleid.apple.com") throw new Error("Invalid issuer");
    if (Math.floor(Date.now() / 1000) > (payload.exp as number)) throw new Error("Token expired");

    const validAudiences = ["com.soulie", "com.soulie.loginbaba"];
    const rawAud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!rawAud.some((a) => validAudiences.includes(a as string))) throw new Error("Invalid audience");

    const keysRes = await fetch("https://appleid.apple.com/auth/keys");
    if (!keysRes.ok) throw new Error("Failed to fetch Apple JWKS");
    const { keys } = (await keysRes.json()) as { keys: Record<string, unknown>[] };
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) throw new Error("No matching Apple public key for kid=" + header.kid);

    const crypto = await import("node:crypto");
    const publicKey = crypto.createPublicKey({ key: jwk as crypto.JsonWebKey, format: "jwk" });

    const signingInput = `${parts[0]}.${parts[1]}`;
    const rawSig = decodeB64(parts[2]);

    function rawSigToDer(raw: Buffer): Buffer {
      const r = raw.subarray(0, 32);
      const s = raw.subarray(32, 64);
      const padInt = (buf: Buffer) => {
        let i = 0;
        while (i < buf.length - 1 && buf[i] === 0) i++;
        let b = buf.subarray(i);
        if (b[0] & 0x80) b = Buffer.concat([Buffer.from([0x00]), b]);
        return b;
      };
      const rp = padInt(r), sp = padInt(s);
      return Buffer.concat([
        Buffer.from([0x30, 4 + rp.length + sp.length, 0x02, rp.length]),
        rp,
        Buffer.from([0x02, sp.length]),
        sp,
      ]);
    }

    const derSig = rawSigToDer(rawSig);
    const isValid = crypto.verify("sha256", Buffer.from(signingInput), publicKey, derSig);
    if (!isValid) throw new Error("Apple identity token signature invalid");

    return payload;
  }

  const APPLE_ADMIN_EMAILS = ["admin@soulie.app", "soulie_admin@admin.com", "yusufstex@gmail.com"];

  app.post("/api/auth/google-login", async (req, res) => {
    const { accessToken } = req.body ?? {};
    if (!accessToken) {
      return res.status(400).json({ error: "accessToken required" });
    }
    try {
      await dbQuery(
        `ALTER TABLE soulie_users ADD COLUMN IF NOT EXISTS google_user_id TEXT UNIQUE`,
        []
      ).catch(() => {});

      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userInfoRes.ok) {
        return res.status(401).json({ error: "invalid_google_token" });
      }
      const userInfo = await userInfoRes.json() as {
        sub: string; email?: string; name?: string; picture?: string;
      };
      const googleId = userInfo.sub;
      if (!googleId) {
        return res.status(401).json({ error: "google_id_missing" });
      }

      const existing = await dbQuery(
        `SELECT * FROM soulie_users WHERE google_user_id = $1 AND deleted_at IS NULL`,
        [googleId]
      );
      if (existing.rows.length > 0) {
        const u = existing.rows[0];
        const isAdmin = u.is_admin || APPLE_ADMIN_EMAILS.includes(u.email?.toLowerCase() ?? "");
        await dbQuery(`UPDATE soulie_users SET last_seen=NOW() WHERE google_user_id=$1`, [googleId]);
        return res.json({
          isNewUser: false,
          user: {
            id: u.id,
            userId: u.user_id,
            name: u.name,
            username: u.username,
            email: u.email,
            language: u.language || "en",
            gender: u.gender,
            birthdate: u.birthdate,
            isAdmin,
            isVip: u.is_vip || isAdmin,
            onboardingComplete: u.onboarding_complete,
          },
        });
      }

      const existingByEmail = userInfo.email
        ? await dbQuery(
            `SELECT * FROM soulie_users WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
            [userInfo.email]
          )
        : { rows: [] };

      if (existingByEmail.rows.length > 0) {
        const u = existingByEmail.rows[0];
        await dbQuery(`UPDATE soulie_users SET google_user_id=$1, last_seen=NOW() WHERE id=$2`, [googleId, u.id]);
        const isAdmin = u.is_admin || APPLE_ADMIN_EMAILS.includes(u.email?.toLowerCase() ?? "");
        return res.json({
          isNewUser: false,
          user: {
            id: u.id,
            userId: u.user_id,
            name: u.name,
            username: u.username,
            email: u.email,
            language: u.language || "en",
            gender: u.gender,
            birthdate: u.birthdate,
            isAdmin,
            isVip: u.is_vip || isAdmin,
            onboardingComplete: u.onboarding_complete,
          },
        });
      }

      const id = "u_" + Date.now().toString() + Math.random().toString(36).substr(2, 6);
      const userId = String(Math.floor(100000 + Math.random() * 900000));
      const displayName = userInfo.name || null;
      const userEmail = userInfo.email || null;

      await dbQuery(
        `INSERT INTO soulie_users (id, user_id, google_user_id, email, name, language, onboarding_complete, last_seen, synced_at)
         VALUES ($1, $2, $3, $4, $5, 'en', false, NOW(), $6)
         ON CONFLICT (id) DO NOTHING`,
        [id, userId, googleId, userEmail, displayName, Date.now()]
      );

      return res.json({ isNewUser: true, id, userId, email: userEmail, name: displayName });
    } catch (err) {
      console.error("[Google] Login error:", err);
      return res.status(500).json({ error: "google_auth_failed" });
    }
  });

  app.post("/api/auth/apple-login", async (req, res) => {
    const { identityToken, appleUserId, email, fullName } = req.body ?? {};
    if (!identityToken || !appleUserId) {
      return res.status(400).json({ error: "identityToken and appleUserId required" });
    }
    try {
      let payload: Record<string, unknown>;
      try {
        payload = await verifyAppleIdentityToken(identityToken);
      } catch (verifyErr) {
        console.warn("[Apple] Token verify failed, falling back to unverified decode:", verifyErr);
        const parts = identityToken.split(".");
        const decodeB64 = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
        payload = JSON.parse(decodeB64(parts[1]).toString("utf8"));
        if (Math.floor(Date.now() / 1000) > (payload.exp as number)) {
          return res.status(401).json({ error: "token_expired" });
        }
      }

      const sub = (payload.sub as string) || appleUserId;
      const existingUser = await findUserByAppleId(sub);

      if (existingUser) {
        const isAdmin = existingUser.is_admin || APPLE_ADMIN_EMAILS.includes(existingUser.email?.toLowerCase() ?? "");
        await dbQuery(`UPDATE soulie_users SET last_seen=NOW() WHERE apple_user_id=$1`, [sub]);
        return res.json({
          isNewUser: false,
          user: {
            id: existingUser.id,
            userId: existingUser.user_id,
            name: existingUser.name,
            username: existingUser.username,
            email: existingUser.email,
            language: existingUser.language || "en",
            gender: existingUser.gender,
            birthdate: existingUser.birthdate,
            isAdmin,
            isVip: existingUser.is_vip || isAdmin,
            onboardingComplete: existingUser.onboarding_complete,
          },
        });
      }

      const id = "u_" + Date.now().toString() + Math.random().toString(36).substr(2, 6);
      const userId = String(Math.floor(100000 + Math.random() * 900000));
      const userEmail = email || (payload.email as string | undefined) || null;
      const firstName = fullName?.givenName || null;
      const lastName = fullName?.familyName || null;
      const displayName = firstName && lastName ? `${firstName} ${lastName}` : firstName || null;

      await dbQuery(
        `INSERT INTO soulie_users (id, user_id, apple_user_id, email, name, language, onboarding_complete, last_seen, synced_at)
         VALUES ($1, $2, $3, $4, $5, 'en', false, NOW(), $6)
         ON CONFLICT (id) DO NOTHING`,
        [id, userId, sub, userEmail, displayName, Date.now()]
      );

      return res.json({ isNewUser: true, id, userId, email: userEmail, name: displayName });
    } catch (err) {
      console.error("[Apple] Login error:", err);
      return res.status(500).json({ error: "apple_auth_failed" });
    }
  });

  function decodeAppleJwt(token: string): { header: Record<string, unknown>; payload: Record<string, unknown> } {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format: expected 3 parts");
    const decodeB64 = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return {
      header: JSON.parse(decodeB64(parts[0])),
      payload: JSON.parse(decodeB64(parts[1])),
    };
  }

  function parseAppleEvents(payload: Record<string, unknown>): Record<string, unknown> {
    const eventsRaw = payload.events;
    if (!eventsRaw) return {};
    if (typeof eventsRaw === "string") {
      try { return JSON.parse(eventsRaw); } catch { return {}; }
    }
    if (typeof eventsRaw === "object") return eventsRaw as Record<string, unknown>;
    return {};
  }

  app.post("/api/notifications/apple", async (req, res) => {
    const rawJwt: string = req.body?.payload ?? req.body?.["payload"] ?? "";

    if (!rawJwt) {
      console.warn("[Apple] Empty notification payload received");
      return res.status(400).json({ error: "Missing payload" });
    }

    let jwtPayload: Record<string, unknown>;
    let jwtHeader: Record<string, unknown>;
    try {
      const decoded = decodeAppleJwt(rawJwt);
      jwtPayload = decoded.payload;
      jwtHeader = decoded.header;
    } catch (err) {
      console.error("[Apple] JWT decode failed:", err);
      return res.status(400).json({ error: "Invalid JWT payload" });
    }

    const events = parseAppleEvents(jwtPayload);
    const notificationType = (events.type ?? jwtPayload.type ?? "unknown") as string;
    const appleUserId = (events.sub ?? jwtPayload.sub ?? null) as string | null;
    const email = (events.email ?? null) as string | null;
    const jti = (jwtPayload.jti ?? null) as string | null;
    const eventDatetimeMs = (events.event_datetime ?? null) as number | null;
    const eventDatetime = eventDatetimeMs ? new Date(eventDatetimeMs) : null;

    console.log("[Apple Notification]", {
      type: notificationType,
      jti,
      appleUserId,
      email,
      alg: jwtHeader.alg,
      iss: jwtPayload.iss,
      aud: jwtPayload.aud,
    });

    let actionTaken = "logged";
    let matchedUser: Record<string, unknown> | null = null;

    try {
      if (appleUserId) {
        matchedUser = await findUserByAppleId(appleUserId);
      }
      if (!matchedUser && email) {
        matchedUser = await findUserByEmail(email);
      }

      switch (notificationType) {
        case "email-disabled": {
          console.log("[Apple] Private email relay DISABLED for user:", appleUserId ?? email);
          if (appleUserId) await updateEmailRelayStatus(appleUserId, true);
          if (matchedUser) {
            await logEvent(matchedUser.id as string, "apple_email_relay_disabled", null, null,
              { appleUserId, email, source: "apple_notification" });
          }
          actionTaken = "email_relay_disabled";
          break;
        }

        case "email-enabled": {
          console.log("[Apple] Private email relay ENABLED for user:", appleUserId ?? email);
          if (appleUserId) await updateEmailRelayStatus(appleUserId, false);
          if (matchedUser) {
            await logEvent(matchedUser.id as string, "apple_email_relay_enabled", null, null,
              { appleUserId, email, source: "apple_notification" });
          }
          actionTaken = "email_relay_enabled";
          break;
        }

        case "consent-revoked": {
          console.log("[Apple] User REVOKED consent (stopped using Sign in with Apple):", appleUserId);
          if (appleUserId) await revokeAppleConsent(appleUserId);
          if (matchedUser) {
            await logEvent(matchedUser.id as string, "apple_consent_revoked", null, null,
              { appleUserId, source: "apple_notification" });
          }
          actionTaken = "consent_revoked";
          break;
        }

        case "account-delete": {
          console.log("[Apple] User DELETED Apple account — marking for deletion:", appleUserId);
          if (appleUserId) {
            const deleted = await softDeleteUserByAppleId(appleUserId, "apple_account_delete");
            matchedUser = deleted;
          } else if (email) {
            const userByEmail = await findUserByEmail(email);
            if (userByEmail) {
              matchedUser = userByEmail;
              await softDeleteUser(userByEmail.id, "apple_account_delete");
            }
          }
          actionTaken = matchedUser ? "user_soft_deleted" : "no_user_found";
          console.log(`[Apple] account-delete action: ${actionTaken}`);
          break;
        }

        case "device-linked": {
          console.log("[Apple] New device linked for user:", appleUserId);
          if (matchedUser) {
            await logEvent(matchedUser.id as string, "apple_device_linked", null, null,
              { appleUserId, source: "apple_notification" });
          }
          actionTaken = "device_linked_logged";
          break;
        }

        case "device-unlinked": {
          console.log("[Apple] Device unlinked for user:", appleUserId);
          if (matchedUser) {
            await logEvent(matchedUser.id as string, "apple_device_unlinked", null, null,
              { appleUserId, source: "apple_notification" });
          }
          actionTaken = "device_unlinked_logged";
          break;
        }

        default: {
          console.warn("[Apple] Unknown notification type:", notificationType);
          actionTaken = "unknown_type_logged";
          break;
        }
      }

      const notifId = await saveAppleNotification({
        jti,
        notificationType,
        appleUserId,
        email,
        eventDatetime,
        rawJwt,
        eventsPayload: events,
        userDbId: matchedUser ? (matchedUser.id as string) : null,
        actionTaken,
      });

      console.log(`[Apple] Notification ${notifId} saved — type: ${notificationType}, action: ${actionTaken}`);
      return res.json({ success: true, notifId, type: notificationType, action: actionTaken });
    } catch (error) {
      console.error("[Apple] Notification processing error:", error);
      return res.status(500).json({ error: "Failed to process Apple notification" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json({ users });
    } catch (err) {
      console.error("Admin users error:", err);
      res.status(500).json({ users: [] });
    }
  });

  app.get("/api/admin/events/:userId", async (req, res) => {
    try {
      const events = await getUserEvents(req.params.userId, 100);
      res.json({ events });
    } catch (err) {
      res.status(500).json({ events: [] });
    }
  });

  app.get("/api/admin/event-stats", async (req, res) => {
    try {
      const stats = await getEventStats();
      res.json({ stats });
    } catch (err) {
      res.status(500).json({ stats: [] });
    }
  });

  app.get("/api/admin/apple-notifications", async (req, res) => {
    try {
      const limit = parseInt(String(req.query.limit ?? 100), 10);
      const notifications = await getAppleNotifications(limit);
      res.json({ notifications });
    } catch (err) {
      console.error("Apple notifications fetch error:", err);
      res.status(500).json({ notifications: [] });
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

  app.get("/api/chats/:userId", async (req, res) => {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "userId required" });
    try {
      const rows = await getChatsForUser(userId);
      res.json({ chats: rows });
    } catch (err) {
      console.error("Get chats error:", err);
      res.status(500).json({ error: "failed to fetch chats" });
    }
  });

  app.post("/api/chats/sync", async (req, res) => {
    const { userId, characterId, conversationId, messages, updatedAt } = req.body;
    if (!userId || !characterId || !conversationId || !Array.isArray(messages)) {
      return res.status(400).json({ error: "userId, characterId, conversationId, messages required" });
    }
    try {
      await upsertChat(userId, characterId, conversationId, messages, updatedAt ?? Date.now());
      res.json({ success: true });
    } catch (err) {
      console.error("Chat sync error:", err);
      res.status(500).json({ error: "chat sync failed" });
    }
  });

  app.delete("/api/chats/:userId/:conversationId", async (req, res) => {
    const { userId, conversationId } = req.params;
    if (!userId || !conversationId) return res.status(400).json({ error: "userId and conversationId required" });
    try {
      await deleteChat(conversationId, userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete chat error:", err);
      res.status(500).json({ error: "delete chat failed" });
    }
  });

  app.post("/api/users/sync-xp", async (req, res) => {
    const { userId, totalXp, level } = req.body;
    if (!userId || totalXp === undefined || level === undefined) {
      return res.status(400).json({ error: "userId, totalXp, level required" });
    }
    try {
      await upsertUserXp(userId, totalXp, level);
      res.json({ success: true });
    } catch (err) {
      console.error("XP sync error:", err);
      res.status(500).json({ error: "xp sync failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
