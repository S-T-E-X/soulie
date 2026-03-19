import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

const STORAGE_KEY = "soulie_streaks_v1";

export type StreakData = {
  lastDate: string;
  streak: number;
  longestStreak: number;
  activeDates: string[];
};

type AllStreaks = Record<string, StreakData>;

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

const defaultData = (): StreakData => ({
  lastDate: "",
  streak: 0,
  longestStreak: 0,
  activeDates: [],
});

async function loadAll(): Promise<AllStreaks> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveAll(all: AllStreaks): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

type StreakStrings = { title: string; body: (name: string) => string };

const STREAK_STRINGS: Record<string, StreakStrings> = {
  en: {
    title: "Streak Warning! 🔥",
    body: (name) => `Don't lose your streak with ${name}! Chat before midnight.`,
  },
  tr: {
    title: "Seri Tehlikede! 🔥",
    body: (name) => `${name} ile seriyi kaybetmek üzeresin! Gece yarısından önce sohbet et.`,
  },
  de: {
    title: "Serie in Gefahr! 🔥",
    body: (name) => `Verliere nicht deine Serie mit ${name}! Chatte vor Mitternacht.`,
  },
  zh: {
    title: "连胜警告！🔥",
    body: (name) => `别丢掉和${name}的连胜！在午夜前聊天。`,
  },
  ko: {
    title: "연속 위험! 🔥",
    body: (name) => `${name}와의 연속을 잃지 마세요! 자정 전에 채팅하세요.`,
  },
  es: {
    title: "¡Racha en peligro! 🔥",
    body: (name) => `¡No pierdas tu racha con ${name}! Chatea antes de medianoche.`,
  },
  ru: {
    title: "Серия под угрозой! 🔥",
    body: (name) => `Не потеряй серию с ${name}! Пиши до полуночи.`,
  },
};

function getStreakStrings(language: string): StreakStrings {
  return STREAK_STRINGS[language] ?? STREAK_STRINGS.en;
}

export async function updateStreakForCharacter(
  characterId: string,
  characterName: string,
  language: string = "en"
): Promise<StreakData> {
  const all = await loadAll();
  const current = all[characterId] ?? defaultData();
  const today = getToday();
  const yesterday = getYesterday();

  if (current.lastDate === today) {
    return current;
  }

  let newStreak: number;
  if (current.lastDate === yesterday) {
    newStreak = current.streak + 1;
  } else if (current.lastDate === "") {
    newStreak = 1;
  } else {
    newStreak = 1;
  }

  const activeDates = [...(current.activeDates ?? [])];
  if (!activeDates.includes(today)) activeDates.push(today);
  const trimmed = activeDates.slice(-30);

  const updated: StreakData = {
    lastDate: today,
    streak: newStreak,
    longestStreak: Math.max(newStreak, current.longestStreak),
    activeDates: trimmed,
  };

  all[characterId] = updated;
  await saveAll(all);

  await scheduleStreakWarning(characterId, characterName, language);

  return updated;
}

async function scheduleStreakWarning(
  characterId: string,
  characterName: string,
  language: string
) {
  if (Platform.OS === "web") return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content.data?.streakWarning === characterId) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const now = new Date();
    const warningTime = new Date(now);
    warningTime.setHours(20, 0, 0, 0);
    if (warningTime <= now) {
      warningTime.setDate(warningTime.getDate() + 1);
    }

    const strings = getStreakStrings(language);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: strings.title,
        body: strings.body(characterName),
        data: { streakWarning: characterId, characterId },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: warningTime,
      },
    });
  } catch {}
}

export function useStreak(characterId: string) {
  const [data, setData] = useState<StreakData>(defaultData());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadAll().then((all) => {
      if (mounted) {
        setData(all[characterId] ?? defaultData());
        setLoaded(true);
      }
    });
    return () => { mounted = false; };
  }, [characterId]);

  const update = useCallback(async (characterName: string, language: string = "en") => {
    const updated = await updateStreakForCharacter(characterId, characterName, language);
    setData(updated);
    return updated;
  }, [characterId]);

  const todayActive = data.lastDate === getToday();
  const isStreakAtRisk = !todayActive && data.streak > 0 && data.lastDate === getYesterday();

  return {
    streak: data.streak,
    longestStreak: data.longestStreak,
    todayActive,
    isStreakAtRisk,
    loaded,
    update,
  };
}

export async function getAllStreaks(): Promise<AllStreaks> {
  return loadAll();
}
