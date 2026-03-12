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

export async function updateStreakForCharacter(
  characterId: string,
  characterName: string,
  language: string = "tr"
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

    const body =
      language === "en"
        ? `Don't lose your streak with ${characterName}! Chat before midnight.`
        : `${characterName} ile seriyi kaybetmek üzeresin! Gece yarısından önce sohbet et.`;

    const title = language === "en" ? "Streak Warning!" : "Seri Tehlikede!";

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
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

  const update = useCallback(async (characterName: string, language: string = "tr") => {
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
