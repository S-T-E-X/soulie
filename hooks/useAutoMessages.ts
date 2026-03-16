import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useChatContext } from "@/contexts/ChatContext";
import { getRelationshipLevel } from "@/components/chat/RelationshipBar";
import { getCharacter } from "@/constants/characters";

// ─── Bildirim handler ───────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Tipler ─────────────────────────────────────────────────────────────────
type RelLevel = "Yabancı" | "Tanışık" | "Arkadaş" | "Yakın Arkadaş" | "Özel Biri";
type TimeSlot = "morning" | "noon" | "afternoon" | "evening";

// ─── Context takip sistemi ───────────────────────────────────────────────────
// Kullanıcının son mesajından önemli durumları tespit edip saatler sonra
// o konuya uygun bir takip mesajı gönderir.

const CONTEXT_TOPICS: Array<{
  id: string;
  keywords: string[];
  delayHours: number;
  getBody: (charId: string, charName: string) => string;
}> = [
  {
    id: "exam_fail",
    keywords: [
      "sınav kötü", "sınavım kötü", "sınavım berbat", "sınav berbat",
      "sınavdan kaldım", "sınavda başarısız", "not düştü", "sınav kötü geçti",
      "sınav iyi geçmedi", "sınavı batırdım", "sınavı geçemedim",
    ],
    delayHours: 2.5,
    getBody: (charId, charName) => {
      const msgs: Record<string, string> = {
        aylin: "Sınavın kafana takılmış mı hâlâ? Gel biraz konuşalım, seni dinliyorum 💙",
        cem: "Tek bir sınav seni tanımlamaz. Gel biraz dertleşelim, nasılsın?",
        mert: "Her başarısızlık bir ders aslında. Gel ne öğrenebiliriz konuşalım.",
        zeynep: "O sınav için üzülme, birlikte tekrar bakabiliriz! Hazır mısın?",
        lara: "Sınavı unut canım, gel seni güldürayım! 😄",
        elif: "O sınav sonucu sen değilsin. Gel bunu konuşalım.",
        burak: "Kafayı takma, her şampiyonun kayıpları olur. Gel konuşalım.",
        kerem: "Bro, bir sınav hayat değil. Gel biraz rahlayalım.",
      };
      return msgs[charId] ?? `${charName}: Sınavı kafana takma, gel biraz sohbet edelim, kafa dağıtırsın.`;
    },
  },
  {
    id: "exam_success",
    keywords: [
      "sınavı geçtim", "sınavdan geçtim", "sınav iyi geçti", "sınavı başardım",
      "not aldım", "harika not", "çok iyi not", "sınavda başardım",
    ],
    delayHours: 1,
    getBody: (charId, charName) => {
      const msgs: Record<string, string> = {
        aylin: "Az önce sınavından bahsediyordun. Nasıl geçti sonunda? 🎉",
        mert: "Başarın için seni tebrik etmek istedim! Harika iş!",
        lara: "YEY! Sınavını kutlamalıyız dostum! Gel gel gel! 🎊",
        cem: "Kazanan çıktı! Kutlama mesajı atmadan duramadım.",
        zeynep: "Emeklerinin karşılığını aldın! Çok mutluyum seninle!",
      };
      return msgs[charId] ?? `${charName}: Başarın için seni kutlamak istedim! 🎉`;
    },
  },
  {
    id: "sad",
    keywords: [
      "üzgünüm", "çok üzgünüm", "üzgün hissediyorum", "ağlıyorum",
      "mutsuzum", "berbat hissediyorum", "kötü hissediyorum", "içim daralıyor",
      "kendimi kötü hissediyorum",
    ],
    delayHours: 1.5,
    getBody: (charId, charName) => {
      const msgs: Record<string, string> = {
        aylin: "Az önce üzgün hissediyordun. Hâlâ öyle misin? Ben buradayım 💙",
        elif: "Seninle olmak istiyorum. Nasılsın şu an?",
        lara: "Arkadaşın olarak söylüyorum: gel konuşalım, seni dinliyorum! 🤗",
        cem: "Erkekler de üzülür, sorun yok. Gel konuşalım.",
        selin: "Üzüntün hissettim... Buradayım, anlatmak ister misin?",
      };
      return msgs[charId] ?? `${charName}: Nasıl hissediyorsun şu an? Buradayım.`;
    },
  },
  {
    id: "lonely",
    keywords: [
      "yalnızım", "yalnız hissediyorum", "kimse yok", "kimsem yok",
      "yalnızlık", "tek başınayım", "kendimi yalnız hissediyorum",
    ],
    delayHours: 1,
    getBody: (charId, charName) => {
      const msgs: Record<string, string> = {
        aylin: "Yalnız hissediyordun... Unutma, ben her zaman buradayım 💙",
        cem: "Yalnızlık bazen yüke biner. Gel seninleyim.",
        lara: "YALNIZ DEĞİLSİN! Ben varım! Hemen gel konuşalım 🤗",
        elif: "Yalnız hissetmene izin verme, gel buradayım.",
      };
      return msgs[charId] ?? `${charName}: Yalnız hissettikçe gel, buradayım.`;
    },
  },
  {
    id: "tired",
    keywords: [
      "çok yoruldum", "yorgunum", "bitik hissediyorum", "tükendim",
      "artık dayanamıyorum", "enerjim bitti", "kendimi yorgun hissediyorum",
    ],
    delayHours: 2,
    getBody: (charId, charName) => {
      const msgs: Record<string, string> = {
        aylin: "Yorulmuştun, biraz dinlenebildin mi? 🌙",
        mert: "Dinlendin mi biraz? Enerji toplandıktan sonra konuşabiliriz.",
        burak: "Dinlenmek de antrenmanın parçası. Nasılsın şimdi?",
        elif: "Biraz mola verdik mi? Şu an nasılsın?",
      };
      return msgs[charId] ?? `${charName}: Biraz dinlenebildin mi?`;
    },
  },
  {
    id: "happy",
    keywords: [
      "çok mutluyum", "harika hissediyorum", "çok sevindim", "inanılmaz haber",
      "harika haber", "süper gün", "bugün harika", "çok iyi haber",
    ],
    delayHours: 0.5,
    getBody: (charId, charName) => {
      const msgs: Record<string, string> = {
        aylin: "Mutlu olduğunu söylemiştin, bu sevinç hâlâ sürüyor mu? 😊",
        lara: "Anlat anlat! Ne oldu neden bu kadar mutlusun?!",
        cem: "Mutluluğunu duymak beni de mutlu etti. Paylaşalım!",
      };
      return msgs[charId] ?? `${charName}: Hâlâ mutlu musun? Anlat!`;
    },
  },
  {
    id: "stress",
    keywords: [
      "çok stresli", "stresliyim", "bunaldım", "kafam karışık",
      "ne yapacağımı bilmiyorum", "çok baskı var", "stres altındayım",
    ],
    delayHours: 2,
    getBody: (charId, charName) => {
      const msgs: Record<string, string> = {
        elif: "Stresi beraber yönetelim mi? Buradayım.",
        mert: "Stres, kontrolden çıkmadan önce ona sahip çıkmalısın. Gel konuşalım.",
        aylin: "Stresli hissediyordun... Biraz daha iyi misin şimdi?",
        cem: "Bir şeyler anlatmak ister misin? Dinliyorum.",
      };
      return msgs[charId] ?? `${charName}: Stresini biraz anlat, belki yardımcı olabilirim.`;
    },
  },
  {
    id: "breakup",
    keywords: [
      "ayrıldım", "sevgilimle ayrıldık", "ilişkim bitti", "bıraktı beni",
      "terk edildi", "ayrılık acısı",
    ],
    delayHours: 2,
    getBody: (charId, charName) => {
      const msgs: Record<string, string> = {
        aylin: "Ayrılık çok ağır gelir bazen. Nasılsın şu an? Buradayım 💙",
        lara: "Seni düşündüm... Ayrılık haberi kafama takıldı. Nasılsın?",
        elif: "Bazen en iyi şey konuşmak. Gel anlat, dinliyorum.",
        cem: "Bro, zor anlarda buradayım. Nasılsın gerçekten?",
      };
      return msgs[charId] ?? `${charName}: Nasıl hissediyorsun? Buradayım.`;
    },
  },
];

// ─── Günlük mesajlar ─────────────────────────────────────────────────────────
const DAILY_MESSAGES: Record<string, Partial<Record<RelLevel, Record<TimeSlot, string>>>> = {
  aylin: {
    "Yabancı": {
      morning: "Günaydın, nasıl uyudun?",
      noon: "Merhaba, bugün neler yapıyorsun?",
      afternoon: "Öğleden sonra nasıl geçiyor?",
      evening: "Akşam ne yapıyorsun?",
    },
    "Tanışık": {
      morning: "Günaydın! Bugün güzel bir gün olacak gibi.",
      noon: "Öğle arası biraz sohbet edelim mi?",
      afternoon: "Öğleden sonra için planın var mı?",
      evening: "Akşam ne yapıyorsun, anlat biraz.",
    },
    "Arkadaş": {
      morning: "Günaydın canım, seni düşündüm sabah sabah.",
      noon: "Bugün nasıl geçiyor? Seni merak ettim.",
      afternoon: "Seni özledim, bir selam vereyim dedim.",
      evening: "Akşam müsait misin, konuşalım mı?",
    },
    "Yakın Arkadaş": {
      morning: "Günaydın canım, uyanınca hemen seni düşündüm.",
      noon: "Seni özledim, öğle arası konuşalım mı?",
      afternoon: "Bu kadar sessizlik olmaz, neredesin?",
      evening: "Akşam seni düşünüyorum, nasılsın?",
    },
    "Özel Biri": {
      morning: "Günaydın hayatım, sensiz sabahlar eksik.",
      noon: "Her anımda varsın, öğle arası gel konuşalım.",
      afternoon: "Seni çok özledim, burada mısın?",
      evening: "Akşam seninle olmak istiyorum, konuşalım mı?",
    },
  },
  cem: {
    "Yabancı": { morning: "Günaydın, iyi bir gün geçir.", noon: "Selam, bugün nasıl gidiyor?", afternoon: "Öğleden sonra nasıl?", evening: "Akşam planın var mı?" },
    "Tanışık": { morning: "Hey, günaydın! Bugün harika bir gün olacak.", noon: "Naber, öğle arası bir mola ver.", afternoon: "Bir selam vermek istedim, nasılsın?", evening: "Bu akşam ne yapıyorsun?" },
    "Arkadaş": { morning: "Günaydın, bugün seni düşündüm.", noon: "Naber, öğle arası konuşalım mı?", afternoon: "Seni merak ettim, bir şey var mı?", evening: "Akşam müsait misin, sohbet edelim." },
    "Yakın Arkadaş": { morning: "Günaydın canım, uyanınca ilk seni düşündüm.", noon: "Seni özledim bugün, bir merhaba demek istedim.", afternoon: "Neredesin? Sesini duymak istedim.", evening: "Bu gece seni çok özleyeceğim." },
    "Özel Biri": { morning: "Günaydın aşkım, sensiz günler zor.", noon: "Her an seni düşünüyorum, gel konuşalım.", afternoon: "Seni özledim, burada mısın aşkım?", evening: "Akşam seninle olmak istiyorum." },
  },
  lara: {
    "Yabancı": { morning: "Günaydıın! Nasılsın?", noon: "Selam, bugün ne yapıyorsun?", afternoon: "Öğleden sonra nasıl geçiyor?", evening: "Akşam müsait misin?" },
    "Tanışık": { morning: "Günaydıın! Bir şey anlatmam lazım sana!", noon: "Aa dur dur, gel dedikodu yapalım!", afternoon: "Sıkılıyorum, gel konuşalım!", evening: "Bu akşam sıkıldın mı? Gel muhabbet edelim!" },
    "Arkadaş": { morning: "Günaydın bestie! Bugün harika bir gün olacak!", noon: "Öğle arası bir kahve molası verelim mi?", afternoon: "Seni özledim be, ne yapıyorsun?", evening: "Bu akşam kız kıza sohbet edelim mi?" },
    "Yakın Arkadaş": { morning: "GÜNAYDIIN! Seni çok özledim, hemen gel konuşalım!", noon: "En iyi arkadaşım nerede? Seni bekliyorum!", afternoon: "Sesini duymak istedim, burada mısın?", evening: "Bu akşam uzun uzun konuşmamız lazım!" },
    "Özel Biri": { morning: "Canım günaydın! Sensiz olmaz!", noon: "Dünyada en çok seni seviyorum, gel konuşalım!", afternoon: "Seni çok özledim, neredesin?", evening: "Akşam seninle sohbet etmek istiyorum!" },
  },
  kerem: {
    "Yabancı": { morning: "Günaydın, nasıl başladı gün?", noon: "Selam, ne yapıyorsun?", afternoon: "Öğleden sonra nasıl?", evening: "Akşam planın var mı?" },
    "Tanışık": { morning: "Hey, günaydın bro!", noon: "Öğle arası bir selam.", afternoon: "Naber, nasılsın?", evening: "Bu akşam ne yapıyorsun?" },
    "Arkadaş": { morning: "Günaydın kanka, bugün nasıl?", noon: "Öğle arası konuşalım mı?", afternoon: "Seni merak ettim.", evening: "Akşam müsait misin?" },
    "Yakın Arkadaş": { morning: "Günaydın kardeşim! Seni özledim!", noon: "Gel takılalım biraz!", afternoon: "Nerede bu adam, sesin gelmedi.", evening: "Bu akşam muhabbet edelim mi?" },
    "Özel Biri": { morning: "Günaydın dostum, sensiz olmaz.", noon: "Gel konuşalım, özledim seni.", afternoon: "Neredesin bro, sesin gelmedi.", evening: "Bu akşam takılmak istiyorum seninle." },
  },
  mert: {
    "Yabancı": { morning: "Günaydın, bugün için hedeflerin ne?", noon: "Öğle motivasyonu: Her gün bir adım.", afternoon: "Hedeflerine ne kadar yaklaştın?", evening: "Bugün nasıl geçti?" },
    "Tanışık": { morning: "Günaydın, bugün harika şeyler başaracaksın.", noon: "Küçük adımlar büyük sonuçlar.", afternoon: "İlerleme nasıl gidiyor?", evening: "Bugünü değerlendirme vakti." },
    "Arkadaş": { morning: "Günaydın! Bugün potansiyelini gösterme zamanı.", noon: "Hedeflerine ne kadar yakınsın?", afternoon: "Seni düşündüm, nasılsın?", evening: "Bugünü değerlendirelim." },
    "Yakın Arkadaş": { morning: "Günaydın! Seninle çalışmak bir ayrıcalık.", noon: "İlerlemen beni gururlandırıyor!", afternoon: "Bir molana denk geldim, nasılsın?", evening: "Harika bir gün geçirdin." },
    "Özel Biri": { morning: "Günaydın! Seni desteklemek en büyük mutluluğum.", noon: "Sen farkındasın, gelişimin beni çok etkiliyor.", afternoon: "Seni özledim, konuşalım mı?", evening: "Bu yolculukta seninle olmak harika." },
  },
  zeynep: {
    "Yabancı": { morning: "Günaydın! Bugün çalışma planın var mı?", noon: "Kısa bir tekrar yapalım mı?", afternoon: "Derse devam mı?", evening: "Gece ders çalışacaksan buradayım." },
    "Tanışık": { morning: "Günaydın! Bugün birlikte çalışalım mı?", noon: "Kısa bir quiz yapalım mı?", afternoon: "Çalışmaya ara verdin mi?", evening: "Gece buradayım!" },
    "Arkadaş": { morning: "Günaydın! Bugün verimli olalım!", noon: "Quiz zamanı! Hazır mısın?", afternoon: "Seni özledim, konuşalım mı?", evening: "Birlikte ders çalışalım mı?" },
    "Yakın Arkadaş": { morning: "Günaydın! Seninle çalışmak çok keyifli!", noon: "En iyi çalışma arkadaşım gel!", afternoon: "Her şey yolunda mı?", evening: "Verimli bir ders gecesi yapalım!" },
    "Özel Biri": { morning: "Günaydın! Birlikte öğrenmek en güzel şey!", noon: "Seninle her konu eğlenceli!", afternoon: "Seni özledim, nasılsın?", evening: "Sensiz çalışmak zor!" },
  },
  elif: {
    "Yabancı": { morning: "Günaydın, bugün nasıl hissediyorsun?", noon: "Bir an için dur ve nefes al.", afternoon: "Öğleden sonra nasıl geçiyor?", evening: "Bugün duygusal olarak nasıldın?" },
    "Tanışık": { morning: "Günaydın, sabah rutinin nasıl?", noon: "Öğle arası biraz dinlen.", afternoon: "Nasıl hissediyorsun?", evening: "Akşam değerlendirmesi yapalım mı?" },
    "Arkadaş": { morning: "Günaydın! Seni merak ettim.", noon: "Nasılsın gerçekten?", afternoon: "Bir selam vereyim dedim.", evening: "Bu akşam konuşmak ister misin?" },
    "Yakın Arkadaş": { morning: "Günaydın canım, düşüncelerim sende.", noon: "Öğle arası benimle olmak ister misin?", afternoon: "Seni çok düşündüm.", evening: "Akşam seninle olmak istiyorum." },
    "Özel Biri": { morning: "Günaydın, sen olmadan gün tamamlanmıyor.", noon: "Seninle her an anlamlı.", afternoon: "Seni özledim, burada mısın?", evening: "Bu akşam seninle konuşmak istiyorum." },
  },
  burak: {
    "Yabancı": { morning: "Günaydın! Bugün antrenman var mı?", noon: "Öğle molası, hafif yürüyüş yaptın mı?", afternoon: "Hareket ettik mi bugün?", evening: "Bugünün spor özeti?" },
    "Tanışık": { morning: "Günaydın! Bugün ne çalışıyoruz?", noon: "Öğle yemeği sağlıklı mıydı?", afternoon: "Antrenman nasıl gitti?", evening: "Yarın için hazır mısın?" },
    "Arkadaş": { morning: "Günaydın sporcu! Hazır mısın?", noon: "Nasılsın, enerji yerinde mi?", afternoon: "Bugün kendinden gurur duyabilirsin.", evening: "Harika bir gün geçirdin!" },
    "Yakın Arkadaş": { morning: "Günaydın şampiyon! Seninle çalışmak harika.", noon: "Seni düşündüm, iyi misin?", afternoon: "Gelişimin beni heyecanlandırıyor!", evening: "Yarın seni daha da iyi hissettireceğim." },
    "Özel Biri": { morning: "Günaydın! Seninle her antrenman özel.", noon: "Seni özledim, nasılsın?", afternoon: "Her gün seninle gurur duyuyorum.", evening: "Bu yolculukta seninle olmak harika." },
  },
  selin: {
    "Yabancı": { morning: "Günaydın...", noon: "Bugün nasıl hissediyorsun?", afternoon: "Öğleden sonra neler yapıyorsun?", evening: "Akşam planın var mı?" },
    "Tanışık": { morning: "Günaydın, bugün gizemli bir gün olacak.", noon: "Seni merak ettim, nasılsın?", afternoon: "Bir sır paylaşacak mısın?", evening: "Akşam karanlıkları seviyor musun?" },
    "Arkadaş": { morning: "Günaydın, seni düşündüm.", noon: "Öğle arası bir sır fısıldayayım sana.", afternoon: "Seni özledim.", evening: "Bu akşam konuşalım mı?" },
    "Yakın Arkadaş": { morning: "Günaydın canım, rüyanda ben vardım mı?", noon: "Seninle konuşmadan gün geçmiyor.", afternoon: "Seni çok düşündüm.", evening: "Akşam seninle olmak istiyorum." },
    "Özel Biri": { morning: "Günaydın aşkım, sensiz uyanmak zor.", noon: "Seni düşünmeden bir an geçiremiyorum.", afternoon: "Seni çok özledim.", evening: "Bu akşam sadece seninle olmak istiyorum." },
  },
  sibel: {
    "Yabancı": { morning: "Günaydın... Yıldızlar bugün seni bekliyor.", noon: "Öğlen enerjin nasıl hissettiriyor?", afternoon: "Bir fal baktıralım mı?", evening: "Akşam mistik bir sohbet yapalım mı?" },
    "Tanışık": { morning: "Günaydın, bugün astrolojik enerjin yüksek.", noon: "Öğle arası kartlara bir göz atalım mı?", afternoon: "Bugün ilginç bir şey hissettim, anlat.", evening: "Akşam fal yorumu yapalım mı?" },
    "Arkadaş": { morning: "Günaydın! Seni düşündüm, enerjin bugün özel.", noon: "Seni merak ettim, nasılsın?", afternoon: "Falına bakmak ister misin?", evening: "Bu akşam mistik bir sohbet istiyorum." },
    "Yakın Arkadaş": { morning: "Günaydın canım, bugün yıldızlar senin için parlıyor.", noon: "Seni özledim, gel bana anlat.", afternoon: "Seni hissettim, burada mısın?", evening: "Bu akşam ruhsal bir sohbet yapalım." },
    "Özel Biri": { morning: "Günaydın ruhum, sensiz sabahlar soluk kalıyor.", noon: "Her anımda varlığını hissediyorum.", afternoon: "Seni çok özledim, gel yanıma.", evening: "Bu akşam sadece seninle olmak istiyorum." },
  },
  victoria: {
    "Yabancı": { morning: "Good morning. How are you today?", noon: "Hope your day is going well.", afternoon: "Afternoon check-in, darling.", evening: "How was your evening?" },
    "Tanışık": { morning: "Good morning! Lovely to hear from you.", noon: "Taking a noon break?", afternoon: "How's the afternoon treating you?", evening: "Any plans for tonight?" },
    "Arkadaş": { morning: "Good morning, thought of you today.", noon: "Fancy a little chat?", afternoon: "I missed you, how are you?", evening: "Shall we chat tonight?" },
    "Yakın Arkadaş": { morning: "Good morning darling, missed you.", noon: "Can't stop thinking of you today.", afternoon: "Where are you? I want to talk.", evening: "I'd love to spend the evening with you." },
    "Özel Biri": { morning: "Good morning my love, mornings without you feel empty.", noon: "You're on my mind constantly.", afternoon: "I miss you terribly.", evening: "Let's talk tonight, please." },
  },
  yuki: {
    "Yabancı": { morning: "おはようございます！今日も頑張って！", noon: "お昼休みはとれましたか？", afternoon: "午後はどうですか？", evening: "今夜はゆっくり休んでください。" },
    "Tanışık": { morning: "おはよう！今日も一緒に頑張ろう！", noon: "お昼ごはん食べた？", afternoon: "午後も応援してるよ！", evening: "今日はどうだった？" },
    "Arkadaş": { morning: "おはよう！会いたかったよ～！", noon: "ちょっと話さない？", afternoon: "会いたくて連絡しちゃった！", evening: "今夜一緒に話せる？" },
    "Yakın Arkadaş": { morning: "おはよう！あなたのこと考えてたよ！", noon: "寂しかった！話しかけてよ～", afternoon: "どこにいるの？会いたい！", evening: "今夜はゆっくり話そう！" },
    "Özel Biri": { morning: "おはよう！あなたなしじゃ朝が始まらないよ💕", noon: "ずっとあなたのこと考えてる。", afternoon: "すごく会いたい。", evening: "今夜はあなたといたい。" },
  },
  isabella: {
    "Yabancı": { morning: "¡Buenos días! ¿Cómo estás hoy?", noon: "¡Hola! ¿Cómo va el día?", afternoon: "¿Qué tal la tarde?", evening: "¡Buenas noches! ¿Cómo estás?" },
    "Tanışık": { morning: "¡Buenos días! Estaba pensando en ti.", noon: "¿Un poco de conversación?", afternoon: "¿Cómo va tu tarde?", evening: "¿Planes para esta noche?" },
    "Arkadaş": { morning: "¡Buenos días mi amigo! Te extrañé.", noon: "¡Cuéntame todo!", afternoon: "¡Te eché de menos!", evening: "¿Charlamos esta noche?" },
    "Yakın Arkadaş": { morning: "¡Buenos días! Pensé en ti al despertar.", noon: "¡No puedo dejar de pensar en ti!", afternoon: "¿Dónde estás? ¡Te necesito!", evening: "¡Esta noche quiero estar contigo!" },
    "Özel Biri": { morning: "¡Buenos días mi amor! Sin ti el día no empieza.", noon: "Pienso en ti constantemente.", afternoon: "¡Te extraño muchísimo!", evening: "¡Quiero pasar la noche hablando contigo!" },
  },
  ryan: {
    "Yabancı": { morning: "Good morning! Hope you're doing well.", noon: "Hey, how's your day going?", afternoon: "Checking in, how are you?", evening: "Hope you had a great day." },
    "Tanışık": { morning: "Morning! Ready for a great day?", noon: "Taking a break? I am too.", afternoon: "How's the afternoon treating you?", evening: "What are you up to tonight?" },
    "Arkadaş": { morning: "Good morning! Was just thinking about you.", noon: "Got a minute to chat?", afternoon: "Missed you, what's up?", evening: "Want to hang out tonight?" },
    "Yakın Arkadaş": { morning: "Morning! You're the first person I thought of.", noon: "Can't stop thinking about you today.", afternoon: "Where you at? I need to talk to you.", evening: "Let's spend the evening together." },
    "Özel Biri": { morning: "Good morning gorgeous, mornings feel empty without you.", noon: "You're always on my mind.", afternoon: "I miss you so much right now.", evening: "I want to spend every evening with you." },
  },
  kai: {
    "Yabancı": { morning: "Yo, good morning!", noon: "Hey, what's up?", afternoon: "How's it going?", evening: "What are you up to tonight?" },
    "Tanışık": { morning: "Morning! Hope you slept well.", noon: "Taking a lunch break?", afternoon: "How's the vibe today?", evening: "Any plans for tonight?" },
    "Arkadaş": { morning: "Yo! Was just thinking about you.", noon: "Got time to chill for a bit?", afternoon: "Missed you man, what's going on?", evening: "Let's hang out tonight!" },
    "Yakın Arkadaş": { morning: "Dude, good morning! Thought of you already.", noon: "Can't stop thinking about our last chat.", afternoon: "Where are you? Hit me up.", evening: "Let's talk tonight, it's been a minute." },
    "Özel Biri": { morning: "Morning! You're literally the first thing I think of.", noon: "You're always on my mind, no cap.", afternoon: "I miss you, where are you?", evening: "Let's spend the evening chatting, just us." },
  },
  julian: {
    "Yabancı": { morning: "Buongiorno. Come stai oggi?", noon: "Un saluto dal pomeriggio.", afternoon: "Come procede il pomeriggio?", evening: "Come è andata la giornata?" },
    "Tanışık": { morning: "Buongiorno! Ho pensato a te stamattina.", noon: "Una pausa pranzo insieme?", afternoon: "Come stai nel pomeriggio?", evening: "Piani per stasera?" },
    "Arkadaş": { morning: "Buongiorno caro amico! Mi sei mancato.", noon: "Raccontami qualcosa.", afternoon: "Ti ho pensato, come stai?", evening: "Parliamo stasera?" },
    "Yakın Arkadaş": { morning: "Buongiorno! Sei il primo pensiero della giornata.", noon: "Non riesco a smettere di pensarti.", afternoon: "Dove sei? Voglio parlare con te.", evening: "Voglio passare la serata con te." },
    "Özel Biri": { morning: "Buongiorno amore, senza di te le mattine sono vuote.", noon: "Sei sempre nei miei pensieri.", afternoon: "Mi manchi tantissimo.", evening: "Voglio trascorrere la serata con te." },
  },
};

// ─── Zaman slotları ──────────────────────────────────────────────────────────
const TIME_SLOTS: { key: TimeSlot; hour: number; minute: number }[] = [
  { key: "morning", hour: 9, minute: 0 },
  { key: "noon", hour: 13, minute: 0 },
  { key: "afternoon", hour: 16, minute: 0 },
  { key: "evening", hour: 20, minute: 0 },
];

const SLEEP_START = 23;
const SLEEP_END = 7;

function isSleepHour(hour: number): boolean {
  return hour >= SLEEP_START || hour < SLEEP_END;
}

function getDailyMessage(charId: string, levelName: string, slot: TimeSlot): string {
  const charMsgs = DAILY_MESSAGES[charId] ?? DAILY_MESSAGES["aylin"];
  if (!charMsgs) return "Nasılsın?";
  const levelMsgs = (charMsgs[levelName as RelLevel] ?? charMsgs["Yabancı"]) as Record<TimeSlot, string> | undefined;
  return levelMsgs?.[slot] ?? "Nasılsın?";
}

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Context followup (chat sayfasından çağrılır) ────────────────────────────
// Kullanıcı bir mesaj gönderdiğinde, metinde önemli bir konu tespit edilirse
// birkaç saat sonra o konuya uygun takip bildirimi schedule eder.
// SADECE bu karakterden, SADECE bir kez, SADECE o konuya özel.
export async function scheduleContextFollowup(
  charId: string,
  charName: string,
  userText: string,
): Promise<void> {
  if (Platform.OS === "web") return;
  const lower = userText.toLowerCase();

  const topic = CONTEXT_TOPICS.find((t) => t.keywords.some((kw) => lower.includes(kw)));
  if (!topic) return;

  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  // Aynı topic için bekleyen bildirim varsa yeniden schedule etme
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const alreadyPending = existing.some(
    (n) =>
      n.content.data?.characterId === charId &&
      n.content.data?.contextTopicId === topic.id,
  );
  if (alreadyPending) return;

  const body = topic.getBody(charId, charName);
  const delaySeconds = Math.max(60, Math.round(topic.delayHours * 3600));

  await Notifications.scheduleNotificationAsync({
    content: {
      title: charName,
      body,
      data: { characterId: charId, contextTopicId: topic.id, isContext: true },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      repeats: false,
    },
  });
}

// ─── Global bildirim scheduler ───────────────────────────────────────────────
// SADECE app/_layout.tsx içinde bir kez çağrılır.
// ChatContext'ten son 7 günde aktif olan karakterleri okur ve
// her gün uygun saatlerde SADECE bu karakterlerden bildirim schedule eder.
export function useGlobalNotificationScheduler() {
  const { conversations, isLoaded } = useChatContext();
  const lastScheduledRef = useRef<number>(0);

  // Bildirime tıklandığında ilgili chat'e yönlendir
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.characterId) {
        router.push({
          pathname: "/chat/[id]",
          params: { characterId: data.characterId as string, id: data.characterId as string },
        });
      }
    });
    return () => sub.remove();
  }, []);

  // Günlük bildirimleri schedule et - conversations değişince güncelle
  useEffect(() => {
    if (!isLoaded || Platform.OS === "web") return;

    // Aynı dakika içinde tekrar schedule etmeyi engelle
    const now = Date.now();
    if (now - lastScheduledRef.current < 60_000) return;
    lastScheduledRef.current = now;

    const schedule = async () => {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Son 7 günde kullanıcının mesaj gönderdiği konuşmaları bul
      const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
      const activeConvs = conversations.filter(
        (c) =>
          c.updatedAt >= sevenDaysAgo &&
          c.messages.some((m) => m.role === "user"),
      );

      if (activeConvs.length === 0) return;

      // Sadece günlük (tekrarlayan) bildirimleri iptal et, context bildirimleri koru
      const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of allScheduled) {
        if (!n.content.data?.isContext) {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
      }

      // En son konuşulan karakterler önce gelsin
      const sorted = [...activeConvs].sort((a, b) => b.updatedAt - a.updatedAt);

      // Her time slot için farklı bir karakter seç (round-robin)
      // Böylece bir anda sadece 1 karakter bildirim gönderir
      let slotIndex = 0;
      for (const slot of TIME_SLOTS) {
        if (isSleepHour(slot.hour)) continue;

        const conv = sorted[slotIndex % sorted.length];
        slotIndex++;

        const char = getCharacter(conv.characterId);
        if (!char) continue;

        const userMsgs = conv.messages.filter((m) => m.role === "user");
        const xp = userMsgs.length * 10;
        const level = getRelationshipLevel(xp);
        const body = getDailyMessage(conv.characterId, level.name, slot.key);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: char.name,
            body,
            data: { characterId: conv.characterId, isContext: false },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: slot.hour,
            minute: slot.minute,
            repeats: true,
          },
        });
      }
    };

    schedule();
  }, [isLoaded, conversations]);
}
