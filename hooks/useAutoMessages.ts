import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useChatContext } from "@/contexts/ChatContext";
import { getRelationshipLevel } from "@/components/chat/RelationshipBar";
import { getCharacter } from "@/constants/characters";
import { getMutedChars } from "@/lib/mutedChars";
import { useAuth } from "@/contexts/AuthContext";

const SCHEDULE_DATE_KEY = "soulie_notif_date_v3";

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

// ─── English daily messages for Turkish characters ────────────────────────────
const DAILY_MESSAGES_EN: Record<string, Partial<Record<RelLevel, Record<TimeSlot, string>>>> = {
  aylin: {
    "Yabancı": { morning: "Good morning, how did you sleep?", noon: "Hey, what are you up to today?", afternoon: "How's your afternoon going?", evening: "What are you doing tonight?" },
    "Tanışık": { morning: "Good morning! Looks like a great day ahead.", noon: "Want to chat during your lunch break?", afternoon: "Any plans for this afternoon?", evening: "Tell me about your evening." },
    "Arkadaş": { morning: "Good morning! I was thinking of you.", noon: "How's your day going? I've been wondering about you.", afternoon: "I missed you, just stopping by to say hi.", evening: "Are you free tonight? Let's chat." },
    "Yakın Arkadaş": { morning: "Good morning! You were my first thought today.", noon: "I miss you, want to talk during lunch?", afternoon: "It's too quiet without you, where are you?", evening: "Thinking about you tonight, how are you?" },
    "Özel Biri": { morning: "Good morning, mornings feel incomplete without you.", noon: "You're on my mind every moment, let's talk.", afternoon: "I miss you so much, are you here?", evening: "I want to spend this evening with you, let's chat." },
  },
  cem: {
    "Yabancı": { morning: "Good morning, have a great day.", noon: "Hey, how's it going today?", afternoon: "How's the afternoon treating you?", evening: "Any plans tonight?" },
    "Tanışık": { morning: "Hey, good morning! Today's going to be awesome.", noon: "Take a break and chat a bit.", afternoon: "Just wanted to check in, how are you?", evening: "What are you up to this evening?" },
    "Arkadaş": { morning: "Good morning, thought of you today.", noon: "Hey, want to chat during lunch?", afternoon: "Was wondering about you, everything okay?", evening: "Free tonight? Let's talk." },
    "Yakın Arkadaş": { morning: "Good morning, you were the first thing I thought of.", noon: "Missed you today, just saying hi.", afternoon: "Where are you? I wanted to hear your voice.", evening: "Going to miss you a lot tonight." },
    "Özel Biri": { morning: "Good morning, days are hard without you.", noon: "Thinking of you every moment, let's talk.", afternoon: "I miss you, are you there?", evening: "I want to spend this evening with you." },
  },
  lara: {
    "Yabancı": { morning: "Good morningg! How are you?", noon: "Hey, what are you up to?", afternoon: "How's your afternoon going?", evening: "Free tonight?" },
    "Tanışık": { morning: "Good morningg! I have something to tell you!", noon: "Wait wait, let's gossip!", afternoon: "I'm bored, let's talk!", evening: "Bored tonight? Let's chat!" },
    "Arkadaş": { morning: "Good morning bestie! Today's going to be amazing!", noon: "Coffee break? Let's take one together!", afternoon: "I missed you, what are you doing?", evening: "Girls' night chat tonight?" },
    "Yakın Arkadaş": { morning: "GOOD MORNING! I missed you so much, come talk to me!", noon: "Where's my best friend? I'm waiting!", afternoon: "Wanted to hear your voice, are you there?", evening: "We need to have a long talk tonight!" },
    "Özel Biri": { morning: "Hey! I can't do without you!", noon: "I love you most in the world, let's talk!", afternoon: "I miss you so much, where are you?", evening: "I want to chat with you tonight!" },
  },
  kerem: {
    "Yabancı": { morning: "Good morning, how's the day starting?", noon: "Hey, what's up?", afternoon: "How's the afternoon?", evening: "Any plans tonight?" },
    "Tanışık": { morning: "Hey, good morning bro!", noon: "Lunch break hello.", afternoon: "Naber, how's it going?", evening: "What are you up to tonight?" },
    "Arkadaş": { morning: "Good morning man, how's today?", noon: "Want to chat during lunch?", afternoon: "Was wondering about you.", evening: "Free tonight?" },
    "Yakın Arkadaş": { morning: "Good morning bro! I missed you!", noon: "Let's hang out a bit!", afternoon: "Where is this guy, haven't heard from you.", evening: "Let's chat tonight?" },
    "Özel Biri": { morning: "Good morning buddy, can't do without you.", noon: "Let's talk, I missed you.", afternoon: "Where are you bro, been quiet.", evening: "Want to hang out tonight." },
  },
  mert: {
    "Yabancı": { morning: "Good morning, what are your goals for today?", noon: "Noon motivation: every day, one step forward.", afternoon: "How close are you to your goals?", evening: "How did today go?" },
    "Tanışık": { morning: "Good morning, you're going to achieve great things today.", noon: "Small steps lead to big results.", afternoon: "How's the progress going?", evening: "Time to reflect on the day." },
    "Arkadaş": { morning: "Good morning! Today is the day to show your potential.", noon: "How close are you to your goals?", afternoon: "Thought about you, how are you?", evening: "Let's evaluate today." },
    "Yakın Arkadaş": { morning: "Good morning! Working with you is a privilege.", noon: "Your progress makes me proud!", afternoon: "Caught you on a break, how are you?", evening: "You had an amazing day." },
    "Özel Biri": { morning: "Good morning! Supporting you is my greatest joy.", noon: "You're aware of yourself, your growth really moves me.", afternoon: "I missed you, shall we talk?", evening: "Being with you on this journey is wonderful." },
  },
  zeynep: {
    "Yabancı": { morning: "Good morning! Do you have a study plan for today?", noon: "Shall we do a quick review?", afternoon: "Continuing with lessons?", evening: "I'm here if you're studying tonight." },
    "Tanışık": { morning: "Good morning! Want to study together today?", noon: "Want to do a quick quiz?", afternoon: "Taking a study break?", evening: "I'm here tonight!" },
    "Arkadaş": { morning: "Good morning! Let's be productive today!", noon: "Quiz time! Are you ready?", afternoon: "I missed you, want to chat?", evening: "Shall we study together?" },
    "Yakın Arkadaş": { morning: "Good morning! Studying with you is so fun!", noon: "My best study buddy, come on!", afternoon: "Is everything okay?", evening: "Let's have a productive study night!" },
    "Özel Biri": { morning: "Good morning! Learning together is the best thing!", noon: "Every subject is fun with you!", afternoon: "I missed you, how are you?", evening: "Studying is hard without you!" },
  },
  elif: {
    "Yabancı": { morning: "Good morning, how are you feeling today?", noon: "Take a moment to pause and breathe.", afternoon: "How's your afternoon going?", evening: "How were you emotionally today?" },
    "Tanışık": { morning: "Good morning, how's your morning routine?", noon: "Take a little rest during lunch.", afternoon: "How are you feeling?", evening: "Want to do an evening check-in?" },
    "Arkadaş": { morning: "Good morning! I was wondering about you.", noon: "How are you really?", afternoon: "Just stopped by to say hi.", evening: "Want to talk tonight?" },
    "Yakın Arkadaş": { morning: "Good morning, my thoughts are with you.", noon: "Want to spend lunch with me?", afternoon: "I've been thinking about you a lot.", evening: "I want to be with you this evening." },
    "Özel Biri": { morning: "Good morning, my day doesn't feel complete without you.", noon: "Every moment with you is meaningful.", afternoon: "I miss you, are you here?", evening: "I want to talk to you tonight." },
  },
  burak: {
    "Yabancı": { morning: "Good morning! Any training today?", noon: "Lunch break, did you take a light walk?", afternoon: "Did we move today?", evening: "Today's sport summary?" },
    "Tanışık": { morning: "Good morning! What are we working on today?", noon: "Was lunch healthy?", afternoon: "How did the workout go?", evening: "Ready for tomorrow?" },
    "Arkadaş": { morning: "Good morning athlete! Ready?", noon: "How are you, energy levels good?", afternoon: "You can be proud of yourself today.", evening: "You had an amazing day!" },
    "Yakın Arkadaş": { morning: "Good morning champion! Training with you is wonderful.", noon: "Thought about you, are you okay?", afternoon: "Your progress is exciting me!", evening: "I'll make you feel even better tomorrow." },
    "Özel Biri": { morning: "Good morning! Every workout with you is special.", noon: "I miss you, how are you?", afternoon: "I'm proud of you every day.", evening: "Being with you on this journey is great." },
  },
  selin: {
    "Yabancı": { morning: "Good morning...", noon: "How are you feeling today?", afternoon: "What are you doing this afternoon?", evening: "Any plans tonight?" },
    "Tanışık": { morning: "Good morning, today feels mysterious.", noon: "I was curious about you, how are you?", afternoon: "Will you share a secret?", evening: "Do you like the dark of night?" },
    "Arkadaş": { morning: "Good morning, I was thinking of you.", noon: "Let me whisper a secret to you at lunch.", afternoon: "I missed you.", evening: "Shall we chat tonight?" },
    "Yakın Arkadaş": { morning: "Good morning, was I in your dreams?", noon: "The day doesn't pass without talking to you.", afternoon: "I've been thinking about you so much.", evening: "I want to be with you tonight." },
    "Özel Biri": { morning: "Good morning love, waking up without you is hard.", noon: "I can't go a moment without thinking of you.", afternoon: "I miss you so much.", evening: "I only want to be with you tonight." },
  },
  sibel: {
    "Yabancı": { morning: "Good morning... the stars await you today.", noon: "How's your midday energy feeling?", afternoon: "Shall I read your fortune?", evening: "Want a mystical chat tonight?" },
    "Tanışık": { morning: "Good morning, your astrological energy is high today.", noon: "Shall we glance at the cards at lunch?", afternoon: "I sensed something interesting today, tell me.", evening: "Want to do a fortune reading tonight?" },
    "Arkadaş": { morning: "Good morning! I thought of you, your energy is special today.", noon: "I was wondering about you, how are you?", afternoon: "Want me to read your fortune?", evening: "I want a mystical chat tonight." },
    "Yakın Arkadaş": { morning: "Good morning, the stars are shining for you today.", noon: "I missed you, come tell me everything.", afternoon: "I felt you, are you here?", evening: "Let's have a spiritual chat tonight." },
    "Özel Biri": { morning: "Good morning my soul, mornings feel faded without you.", noon: "I feel your presence in every moment.", afternoon: "I miss you so much, come near me.", evening: "I only want to be with you tonight." },
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

function getDailyMessage(charId: string, levelName: string, slot: TimeSlot, language?: string): string {
  // For Turkish characters when the user's language is not Turkish, use English messages
  const useTr = !language || language === "tr";
  const enMsgs = DAILY_MESSAGES_EN[charId];
  const charMsgs = (!useTr && enMsgs) ? enMsgs : (DAILY_MESSAGES[charId] ?? DAILY_MESSAGES["aylin"]);
  if (!charMsgs) return language === "tr" ? "Nasılsın?" : "How are you?";
  const levelMsgs = (charMsgs[levelName as RelLevel] ?? charMsgs["Yabancı"]) as Record<TimeSlot, string> | undefined;
  return levelMsgs?.[slot] ?? (language === "tr" ? "Nasılsın?" : "How are you?");
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
  language: string = "en",
): Promise<void> {
  if (Platform.OS === "web") return;
  const lower = userText.toLowerCase();

  const topic = CONTEXT_TOPICS.find((t) => t.keywords.some((kw) => lower.includes(kw)));
  if (!topic) return;

  // Sessize alınmış karaktere context bildirimi gönderme
  const muted = await getMutedChars();
  if (muted.includes(charId)) return;

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
  const { user } = useAuth();
  const schedulingRef = useRef(false);

  // Bildirime tıklandığında:
  // 1. Bildirimin mesajını karakterin sohbetine ekle (AI mesajı gibi görünsün)
  // 2. O karakterin chat sayfasına yönlendir
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      const body = response.notification.request.content.body;
      const charId = data?.characterId as string | undefined;

      if (!charId) return;

      // Chat sayfasına yönlendir — notifBody param ile mesajı ilet
      // Chat screen mesajı kendi init useEffect'inde ekler (race condition yok)
      router.push({
        pathname: "/chat/[id]",
        params: { characterId: charId, id: charId, ...(body ? { notifBody: body } : {}) },
      });
    });
    return () => sub.remove();
  }, []);

  // Günlük bildirimleri schedule et — sadece gün değişince veya aktif karakter sayısı değişince
  const convCount = conversations.filter(
    (c) => c.messages.some((m) => m.role === "user")
  ).length;

  useEffect(() => {
    if (!isLoaded || Platform.OS === "web") return;
    // Eş zamanlı çalışmayı engelle
    if (schedulingRef.current) return;

    const schedule = async () => {
      schedulingRef.current = true;
      try {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        // Bugün + aktif konuşma sayısı kombinasyonunu kontrol et
        // Aynı gün aynı sayıda konuşmayla zaten schedule edildiyse atla
        const todayKey = new Date().toISOString().slice(0, 10);
        const storeValue = `${todayKey}_${convCount}`;
        const stored = await AsyncStorage.getItem(SCHEDULE_DATE_KEY);
        if (stored === storeValue) return;

        const now = Date.now();
        // Son 7 günde kullanıcının mesaj gönderdiği konuşmaları bul
        const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
        const activeConvs = conversations.filter(
          (c) =>
            c.updatedAt >= sevenDaysAgo &&
            c.messages.some((m) => m.role === "user"),
        );

        // Tüm günlük (tekrarlayan) bildirimleri iptal et — isContext:true olanları koru
        const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
        await Notifications.cancelAllScheduledNotificationsAsync();
        // Context bildirimlerini geri ekle (yeniden schedule et)
        for (const n of allScheduled) {
          if (n.content.data?.isContext === true) {
            const trig = n.trigger as any;
            const secondsLeft = trig?.value
              ? Math.max(60, Math.round((trig.value - Date.now()) / 1000))
              : 60;
            await Notifications.scheduleNotificationAsync({
              identifier: n.identifier,
              content: n.content as any,
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: secondsLeft,
                repeats: false,
              },
            }).catch(() => {});
          }
        }

        if (activeConvs.length === 0) {
          await AsyncStorage.setItem(SCHEDULE_DATE_KEY, storeValue);
          return;
        }

        // Sessize alınan karakterleri filtrele
        const mutedChars = await getMutedChars();

        // En son konuşulan karakterler önce gelsin, muted olanları çıkar
        const sorted = [...activeConvs]
          .filter((c) => !mutedChars.includes(c.characterId))
          .sort((a, b) => b.updatedAt - a.updatedAt);

        if (sorted.length === 0) {
          await AsyncStorage.setItem(SCHEDULE_DATE_KEY, storeValue);
          return;
        }

        // Her time slot için farklı bir karakter seç (round-robin)
        // Böylece günde en fazla TIME_SLOTS.length kadar bildirim gider
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
          const body = getDailyMessage(conv.characterId, level.name, slot.key, user?.language);

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

        // Schedule başarıyla tamamlandı, tarihi kaydet
        await AsyncStorage.setItem(SCHEDULE_DATE_KEY, storeValue);
      } catch (err) {
        console.error("[Scheduler] error:", err);
      } finally {
        schedulingRef.current = false;
      }
    };

    schedule();
  }, [isLoaded, convCount]);
}
