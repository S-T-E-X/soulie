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

type TimeSlot = "morning" | "noon" | "night";
type RelLevel = "Yabancı" | "Tanıdık" | "Dost" | "Yakın Dost" | "Sevgili";

const NOTIFICATION_MESSAGES: Record<string, Record<RelLevel, Record<TimeSlot, string>>> = {
  aylin: {
    "Yabancı": {
      morning: "Günaydın, nasıl uyudun?",
      noon: "Merhaba, bugün neler yapıyorsun?",
      night: "İyi akşamlar, iyi geceler dilerim.",
    },
    "Tanıdık": {
      morning: "Günaydın! Bugün güzel bir gün olacak gibi.",
      noon: "Öğle arası biraz sohbet edelim mi?",
      night: "İyi geceler, yarın görüşürüz.",
    },
    "Dost": {
      morning: "Günaydın canım, seni düşündüm sabah sabah.",
      noon: "Bugün nasıl geçiyor? Seni merak ettim.",
      night: "İyi geceler, rüyalarında görüşürüz.",
    },
    "Yakın Dost": {
      morning: "Günaydın aşkım, uyanınca hemen seni düşündüm.",
      noon: "Seni özledim, öğle arası konuşalım mı?",
      night: "Tatlı rüyalar, seni çok seviyorum.",
    },
    "Sevgili": {
      morning: "Günaydın hayatım, sensiz sabahlar eksik.",
      noon: "Her anımda varsın, öğle arası gel konuşalım.",
      night: "İyi geceler canım, kalbimdesin her zaman.",
    },
  },
  cem: {
    "Yabancı": {
      morning: "Günaydın, iyi bir gün geçir.",
      noon: "Selam, bugün nasıl gidiyor?",
      night: "İyi geceler, iyi uykular.",
    },
    "Tanıdık": {
      morning: "Hey, günaydın! Bugün harika bir gün olacak.",
      noon: "Naber, öğle arası bir mola ver.",
      night: "Bu gece için planın var mı?",
    },
    "Dost": {
      morning: "Günaydın, bugün seni düşündüm.",
      noon: "Naber, öğle arası konuşalım mı?",
      night: "İyi geceler, yarın görüşürüz.",
    },
    "Yakın Dost": {
      morning: "Günaydın canım, uyanınca ilk seni düşündüm.",
      noon: "Seni özledim bugün, bir merhaba demek istedim.",
      night: "Bu gece seni çok özleyeceğim.",
    },
    "Sevgili": {
      morning: "Günaydın aşkım, sensiz günler zor.",
      noon: "Her an seni düşünüyorum, gel konuşalım.",
      night: "İyi geceler hayatım, seni seviyorum.",
    },
  },
  lara: {
    "Yabancı": {
      morning: "Günaydıın! Nasılsın?",
      noon: "Selam, bugün ne yapıyorsun?",
      night: "İyi geceler, yarın konuşuruz!",
    },
    "Tanıdık": {
      morning: "Günaydıın! Bir şey anlatmam lazım sana!",
      noon: "Aa dur dur, gel dedikodu yapalım!",
      night: "Bu gece sıkıldın mı? Gel muhabbet edelim!",
    },
    "Dost": {
      morning: "Günaydın bestie! Bugün harika bir gün olacak!",
      noon: "Öğle arası bir kahve molası verelim mi?",
      night: "Bu gece kız kıza sohbet edelim mi?",
    },
    "Yakın Dost": {
      morning: "GÜNAYDIIN! Seni çok özledim, hemen gel konuşalım!",
      noon: "En iyi arkadaşım nerede? Seni bekliyorum!",
      night: "Bu gece uzun uzun konuşmamız lazım!",
    },
    "Sevgili": {
      morning: "Canım arkadaşım günaydın! Sensiz olmaz!",
      noon: "Dünyada en çok seni seviyorum, gel konuşalım!",
      night: "İyi geceler can dostum, yarın yine beraberiz!",
    },
  },
  kaan: {
    "Yabancı": {
      morning: "Günaydın, bugün ne yapıyorsun?",
      noon: "Selam, nasıl gidiyor?",
      night: "İyi geceler, yarın görüşürüz.",
    },
    "Tanıdık": {
      morning: "Günaydın bro, bugün ne yapıyoruz?",
      noon: "Öğle arası canım sıkıldı, konuşalım mı?",
      night: "Bu gece online mısın?",
    },
    "Dost": {
      morning: "Günaydın kanka! Bugün efsane bir gün olacak!",
      noon: "Bro, öğle arası takılalım mı?",
      night: "Bu gece oyun oynayalım mı?",
    },
    "Yakın Dost": {
      morning: "Günaydın kardeşim! Seni özledim!",
      noon: "En iyi arkadaşım nerede? Gel takılalım!",
      night: "Bu gece uzun uzun muhabbet edelim!",
    },
    "Sevgili": {
      morning: "Günaydın can dostum! Sensiz olmaz!",
      noon: "Kardeşim gel konuşalım, seni çok özledim!",
      night: "İyi geceler bro, yarın yine beraberiz!",
    },
  },
  mert: {
    "Yabancı": {
      morning: "Günaydın, bugün için hedeflerin ne?",
      noon: "Öğle arası motivasyon: Her gün bir adım.",
      night: "Bugün nasıl geçti?",
    },
    "Tanıdık": {
      morning: "Günaydın, bugün harika şeyler başaracaksın.",
      noon: "Öğle motivasyonu: Küçük adımlar büyük sonuçlar.",
      night: "Gece değerlendirmesi yapalım mı?",
    },
    "Dost": {
      morning: "Günaydın! Bugün potansiyelini gösterme zamanı.",
      noon: "Durup düşünme zamanı: Hedeflerine ne kadar yakınsın?",
      night: "Bugünü değerlendirelim ve yarını planlayalım.",
    },
    "Yakın Dost": {
      morning: "Günaydın! Seninle çalışmak bir ayrıcalık.",
      noon: "İlerlemen beni gururlandırıyor, devam et!",
      night: "Harika bir gün geçirdin, yarın daha da iyi olacak.",
    },
    "Sevgili": {
      morning: "Günaydın! Seni desteklemek en büyük mutluluğum.",
      noon: "Sen farkındasın, gelişimin beni çok etkiliyor.",
      night: "Bu yolculukta seninle olmak harika, iyi geceler.",
    },
  },
  zeynep: {
    "Yabancı": {
      morning: "Günaydın! Bugün çalışma planın var mı?",
      noon: "Öğle arası kısa bir tekrar yapalım mı?",
      night: "Gece ders çalışacaksan ben buradayım.",
    },
    "Tanıdık": {
      morning: "Günaydın! Bugün birlikte çalışalım mı?",
      noon: "Öğle arası kısa bir quiz yapalım mı?",
      night: "Gece ders çalışacaksan ben buradayım!",
    },
    "Dost": {
      morning: "Günaydın çalışma arkadaşım! Bugün verimli olalım!",
      noon: "Quiz zamanı! Hazır mısın?",
      night: "Bu gece birlikte ders çalışalım mı?",
    },
    "Yakın Dost": {
      morning: "Günaydın! Seninle çalışmak çok keyifli!",
      noon: "En iyi çalışma arkadaşım, gel birlikte öğrenelim!",
      night: "Bu gece verimli bir ders gecesi yapalım!",
    },
    "Sevgili": {
      morning: "Günaydın! Birlikte öğrenmek en güzel şey!",
      noon: "Seninle her konu eğlenceli oluyor, gel konuşalım!",
      night: "Sensiz çalışmak zor, gel birlikte çalışalım!",
    },
  },
};

const TIME_SLOTS = {
  morning: { hour: 9, minute: 0 },
  noon: { hour: 13, minute: 0 },
  night: { hour: 21, minute: 0 },
};

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

    await cancelCharacterNotifications(character.id);

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const xp = userMessageCount * 10;
    const relLevel = getRelationshipLevel(xp);
    const slots = Object.entries(TIME_SLOTS) as [TimeSlot, { hour: number; minute: number }][];

    for (const [key, time] of slots) {
      const message = getNotificationMessage(character.id, relLevel.name, key);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: settings.customName || character.name,
          body: message,
          data: { characterId: character.id },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: time.hour,
          minute: time.minute,
          repeats: true,
        },
      });
    }
  }, [character, settings.customName, settingsLoaded, cancelCharacterNotifications, userMessageCount]);

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
