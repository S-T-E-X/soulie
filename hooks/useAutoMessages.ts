import { useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { type Character } from "@/constants/characters";
import { type CharacterSettings } from "@/hooks/useCharacterSettings";
import { getRelationshipLevel } from "@/components/chat/RelationshipBar";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type TimeSlot = "morning" | "noon" | "afternoon" | "evening";
type RelLevel = "Yabancı" | "Tanıdık" | "Dost" | "Yakın Dost" | "Sevgili";

const GREETING_KEYWORDS = [
  "günaydın", "iyi geceler", "iyi uykular", "iyi akşamlar", "iyi günler",
  "good morning", "good night", "good evening", "gece", "uyku",
];

function isGreeting(text: string): boolean {
  const lower = text.toLowerCase();
  return GREETING_KEYWORDS.some((kw) => lower.includes(kw));
}

const NOTIFICATION_MESSAGES: Record<string, Record<RelLevel, Record<TimeSlot, string>>> = {
  aylin: {
    "Yabancı": {
      morning: "Günaydın, nasıl uyudun?",
      noon: "Merhaba, bugün neler yapıyorsun?",
      afternoon: "Öğleden sonra nasıl geçiyor?",
      evening: "Akşam ne yapıyorsun?",
    },
    "Tanıdık": {
      morning: "Günaydın! Bugün güzel bir gün olacak gibi.",
      noon: "Öğle arası biraz sohbet edelim mi?",
      afternoon: "Öğleden sonra için planın var mı?",
      evening: "Akşam ne yapıyorsun, anlat biraz.",
    },
    "Dost": {
      morning: "Günaydın canım, seni düşündüm sabah sabah.",
      noon: "Bugün nasıl geçiyor? Seni merak ettim.",
      afternoon: "Seni özledim, bir selam vereyim dedim.",
      evening: "Akşam müsait misin, konuşalım mı?",
    },
    "Yakın Dost": {
      morning: "Günaydın canım, uyanınca hemen seni düşündüm.",
      noon: "Seni özledim, öğle arası konuşalım mı?",
      afternoon: "Bu kadar sessizlik olmaz, neredesin?",
      evening: "Akşam seni düşünüyorum, nasılsın?",
    },
    "Sevgili": {
      morning: "Günaydın hayatım, sensiz sabahlar eksik.",
      noon: "Her anımda varsın, öğle arası gel konuşalım.",
      afternoon: "Seni çok özledim, burada mısın?",
      evening: "Akşam seninle olmak istiyorum, konuşalım mı?",
    },
  },
  cem: {
    "Yabancı": {
      morning: "Günaydın, iyi bir gün geçir.",
      noon: "Selam, bugün nasıl gidiyor?",
      afternoon: "Öğleden sonra nasıl?",
      evening: "Akşam planın var mı?",
    },
    "Tanıdık": {
      morning: "Hey, günaydın! Bugün harika bir gün olacak.",
      noon: "Naber, öğle arası bir mola ver.",
      afternoon: "Bir selam vermek istedim, nasılsın?",
      evening: "Bu akşam ne yapıyorsun?",
    },
    "Dost": {
      morning: "Günaydın, bugün seni düşündüm.",
      noon: "Naber, öğle arası konuşalım mı?",
      afternoon: "Seni merak ettim, bir şey var mı?",
      evening: "Akşam müsait misin, sohbet edelim.",
    },
    "Yakın Dost": {
      morning: "Günaydın canım, uyanınca ilk seni düşündüm.",
      noon: "Seni özledim bugün, bir merhaba demek istedim.",
      afternoon: "Neredesin? Sesini duymak istedim.",
      evening: "Bu gece seni çok özleyeceğim.",
    },
    "Sevgili": {
      morning: "Günaydın aşkım, sensiz günler zor.",
      noon: "Her an seni düşünüyorum, gel konuşalım.",
      afternoon: "Seni özledim, burada mısın aşkım?",
      evening: "Akşam seninle olmak istiyorum.",
    },
  },
  lara: {
    "Yabancı": {
      morning: "Günaydıın! Nasılsın?",
      noon: "Selam, bugün ne yapıyorsun?",
      afternoon: "Öğleden sonra nasıl geçiyor?",
      evening: "Akşam müsait misin?",
    },
    "Tanıdık": {
      morning: "Günaydıın! Bir şey anlatmam lazım sana!",
      noon: "Aa dur dur, gel dedikodu yapalım!",
      afternoon: "Sıkılıyorum, gel konuşalım!",
      evening: "Bu akşam sıkıldın mı? Gel muhabbet edelim!",
    },
    "Dost": {
      morning: "Günaydın bestie! Bugün harika bir gün olacak!",
      noon: "Öğle arası bir kahve molası verelim mi?",
      afternoon: "Seni özledim be, ne yapıyorsun?",
      evening: "Bu akşam kız kıza sohbet edelim mi?",
    },
    "Yakın Dost": {
      morning: "GÜNAYDIIN! Seni çok özledim, hemen gel konuşalım!",
      noon: "En iyi arkadaşım nerede? Seni bekliyorum!",
      afternoon: "Sesini duymak istedim, burada mısın?",
      evening: "Bu akşam uzun uzun konuşmamız lazım!",
    },
    "Sevgili": {
      morning: "Canım arkadaşım günaydın! Sensiz olmaz!",
      noon: "Dünyada en çok seni seviyorum, gel konuşalım!",
      afternoon: "Seni çok özledim, neredesin?",
      evening: "Akşam seninle sohbet etmek istiyorum!",
    },
  },
  kaan: {
    "Yabancı": {
      morning: "Günaydın, bugün ne yapıyorsun?",
      noon: "Selam, nasıl gidiyor?",
      afternoon: "Öğleden sonra ne yapıyorsun?",
      evening: "Akşam planın var mı?",
    },
    "Tanıdık": {
      morning: "Günaydın bro, bugün ne yapıyoruz?",
      noon: "Öğle arası canım sıkıldı, konuşalım mı?",
      afternoon: "Ne halt ediyorsun, anlat.",
      evening: "Bu akşam online mısın?",
    },
    "Dost": {
      morning: "Günaydın kanka! Bugün efsane bir gün olacak!",
      noon: "Bro, öğle arası takılalım mı?",
      afternoon: "Kanka neredesin, sessizliğin tuhaf geldi.",
      evening: "Bu akşam oyun oynayalım mı?",
    },
    "Yakın Dost": {
      morning: "Günaydın kardeşim! Seni özledim!",
      noon: "En iyi arkadaşım nerede? Gel takılalım!",
      afternoon: "Seni merak ettim, her şey yolunda mı?",
      evening: "Bu akşam uzun uzun muhabbet edelim!",
    },
    "Sevgili": {
      morning: "Günaydın can dostum! Sensiz olmaz!",
      noon: "Kardeşim gel konuşalım, seni çok özledim!",
      afternoon: "Sesin gelmeden duramadım, ne yapıyorsun?",
      evening: "Bu akşam seninle takılmak istiyorum bro.",
    },
  },
  mert: {
    "Yabancı": {
      morning: "Günaydın, bugün için hedeflerin ne?",
      noon: "Öğle arası motivasyon: Her gün bir adım.",
      afternoon: "Öğleden sonra hedeflerine ne kadar yaklaştın?",
      evening: "Bugün nasıl geçti, bir değerlendirme yapalım mı?",
    },
    "Tanıdık": {
      morning: "Günaydın, bugün harika şeyler başaracaksın.",
      noon: "Öğle motivasyonu: Küçük adımlar büyük sonuçlar.",
      afternoon: "İlerleme nasıl gidiyor?",
      evening: "Gece değerlendirmesi yapalım mı?",
    },
    "Dost": {
      morning: "Günaydın! Bugün potansiyelini gösterme zamanı.",
      noon: "Hedeflerine ne kadar yakınsın?",
      afternoon: "Seni düşündüm, nasılsın?",
      evening: "Bugünü değerlendirelim ve yarını planlayalım.",
    },
    "Yakın Dost": {
      morning: "Günaydın! Seninle çalışmak bir ayrıcalık.",
      noon: "İlerlemen beni gururlandırıyor, devam et!",
      afternoon: "Bir molana denk geldim, nasılsın?",
      evening: "Harika bir gün geçirdin, yarın daha da iyi olacak.",
    },
    "Sevgili": {
      morning: "Günaydın! Seni desteklemek en büyük mutluluğum.",
      noon: "Sen farkındasın, gelişimin beni çok etkiliyor.",
      afternoon: "Seni özledim, konuşalım mı?",
      evening: "Bu yolculukta seninle olmak harika.",
    },
  },
  zeynep: {
    "Yabancı": {
      morning: "Günaydın! Bugün çalışma planın var mı?",
      noon: "Öğle arası kısa bir tekrar yapalım mı?",
      afternoon: "Öğleden sonra derslere devam mı?",
      evening: "Gece ders çalışacaksan ben buradayım.",
    },
    "Tanıdık": {
      morning: "Günaydın! Bugün birlikte çalışalım mı?",
      noon: "Öğle arası kısa bir quiz yapalım mı?",
      afternoon: "Çalışmaya ara verdin mi, nasılsın?",
      evening: "Gece ders çalışacaksan ben buradayım!",
    },
    "Dost": {
      morning: "Günaydın çalışma arkadaşım! Bugün verimli olalım!",
      noon: "Quiz zamanı! Hazır mısın?",
      afternoon: "Seni özledim, konuşalım mı?",
      evening: "Bu akşam birlikte ders çalışalım mı?",
    },
    "Yakın Dost": {
      morning: "Günaydın! Seninle çalışmak çok keyifli!",
      noon: "En iyi çalışma arkadaşım, gel birlikte öğrenelim!",
      afternoon: "Seni düşündüm, her şey yolunda mı?",
      evening: "Bu akşam verimli bir ders gecesi yapalım!",
    },
    "Sevgili": {
      morning: "Günaydın! Birlikte öğrenmek en güzel şey!",
      noon: "Seninle her konu eğlenceli oluyor, gel konuşalım!",
      afternoon: "Seni özledim, nasılsın?",
      evening: "Sensiz çalışmak zor, gel birlikte çalışalım!",
    },
  },
};

const SLEEP_START = 23;
const SLEEP_END = 7;
const MIN_INACTIVE_HOURS = 5;

const TIME_SLOTS: { key: TimeSlot; hour: number; minute: number }[] = [
  { key: "morning", hour: 9, minute: 0 },
  { key: "noon", hour: 13, minute: 0 },
  { key: "afternoon", hour: 16, minute: 0 },
  { key: "evening", hour: 20, minute: 0 },
];

function isSleepHour(hour: number): boolean {
  return hour >= SLEEP_START || hour < SLEEP_END;
}

function getNotificationMessage(characterId: string, levelName: string, timeSlot: TimeSlot): string {
  const charMessages = NOTIFICATION_MESSAGES[characterId] || NOTIFICATION_MESSAGES.aylin;
  const levelMessages = charMessages[levelName as RelLevel] || charMessages["Yabancı"];
  return levelMessages[timeSlot];
}

async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

export function useAutoMessages(
  character: Character | undefined,
  settings: CharacterSettings,
  settingsLoaded: boolean,
  userMessageCount: number,
  lastUserMessageTime: number = 0,
  lastUserMessageText: string = "",
) {
  const cancelCharacterNotifications = useCallback(async (charId: string) => {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of allScheduled) {
      if (notification.content.data?.characterId === charId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }, []);

  const scheduleNotifications = useCallback(async () => {
    if (!character || !settingsLoaded || Platform.OS === "web") return;
    if (userMessageCount === 0) return;

    await cancelCharacterNotifications(character.id);

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const xp = userMessageCount * 10;
    const relLevel = getRelationshipLevel(xp);
    const lastMsgIsGreeting = isGreeting(lastUserMessageText);

    const now = Date.now();
    const fiveHoursMs = MIN_INACTIVE_HOURS * 60 * 60 * 1000;
    const userIsInactive = lastUserMessageTime === 0 || (now - lastUserMessageTime) >= fiveHoursMs;

    for (const slot of TIME_SLOTS) {
      if (isSleepHour(slot.hour)) continue;

      if (!userIsInactive) continue;

      const isGreetingSlot = slot.key === "morning" || slot.key === "evening";
      if (lastMsgIsGreeting && isGreetingSlot) continue;

      const message = getNotificationMessage(character.id, relLevel.name, slot.key);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: settings.customName || character.name,
          body: message,
          data: { characterId: character.id },
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
  }, [character, settings.customName, settingsLoaded, cancelCharacterNotifications, userMessageCount, lastUserMessageTime, lastUserMessageText]);

  useEffect(() => {
    scheduleNotifications();
  }, [scheduleNotifications]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.characterId) {
        router.push({
          pathname: "/chat/[id]",
          params: { characterId: data.characterId as string, id: data.characterId as string },
        });
      }
    });
    return () => subscription.remove();
  }, []);
}
