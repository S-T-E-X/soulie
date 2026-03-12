import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "soulie_weekly_missions_v1";
const XP_KEY = "soulie_bonus_xp_v1";

export type MissionType =
  | "send_messages"
  | "different_characters"
  | "chat_days"
  | "send_gift"
  | "streak_days"
  | "new_character";

export type Mission = {
  id: string;
  type: MissionType;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  target: number;
  reward: number;
  icon: string;
};

export type MissionProgress = {
  missionId: string;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
};

export type WeeklyMissionsData = {
  weekKey: string;
  missions: Mission[];
  progress: Record<string, MissionProgress>;
};

const MISSION_POOL: Mission[] = [
  {
    id: "send_15",
    type: "send_messages",
    title: "15 Mesaj Gönder",
    titleEn: "Send 15 Messages",
    description: "Bu hafta toplam 15 mesaj gönder",
    descriptionEn: "Send 15 messages total this week",
    target: 15,
    reward: 50,
    icon: "message-circle",
  },
  {
    id: "send_30",
    type: "send_messages",
    title: "30 Mesaj Gönder",
    titleEn: "Send 30 Messages",
    description: "Bu hafta toplam 30 mesaj gönder",
    descriptionEn: "Send 30 messages total this week",
    target: 30,
    reward: 80,
    icon: "message-circle",
  },
  {
    id: "diff_chars_2",
    type: "different_characters",
    title: "2 Farklı Karakter",
    titleEn: "2 Different Characters",
    description: "2 farklı AI arkadaşla sohbet et",
    descriptionEn: "Chat with 2 different AI friends",
    target: 2,
    reward: 40,
    icon: "users",
  },
  {
    id: "diff_chars_3",
    type: "different_characters",
    title: "3 Farklı Karakter",
    titleEn: "3 Different Characters",
    description: "3 farklı AI arkadaşla sohbet et",
    descriptionEn: "Chat with 3 different AI friends",
    target: 3,
    reward: 70,
    icon: "users",
  },
  {
    id: "chat_3days",
    type: "chat_days",
    title: "3 Gün Üst Üste",
    titleEn: "3 Days in a Row",
    description: "3 gün art arda herhangi bir AI ile sohbet et",
    descriptionEn: "Chat on 3 consecutive days",
    target: 3,
    reward: 60,
    icon: "calendar",
  },
  {
    id: "streak_5",
    type: "streak_days",
    title: "5 Günlük Seri",
    titleEn: "5 Day Streak",
    description: "Herhangi bir karakterle 5 günlük seri yap",
    descriptionEn: "Achieve a 5-day streak with any character",
    target: 5,
    reward: 100,
    icon: "zap",
  },
  {
    id: "send_gift",
    type: "send_gift",
    title: "Hediye Gönder",
    titleEn: "Send a Gift",
    description: "Bir AI arkadaşına hediye gönder",
    descriptionEn: "Send a gift to an AI friend",
    target: 1,
    reward: 30,
    icon: "gift",
  },
  {
    id: "new_char",
    type: "new_character",
    title: "Yeni Tanışma",
    titleEn: "New Connection",
    description: "Daha önce hiç sohbet etmediğin biriyle başla",
    descriptionEn: "Start a chat with someone new",
    target: 1,
    reward: 35,
    icon: "user-plus",
  },
];

function getWeekKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${weekNum}`;
}

function generateMissionsForWeek(weekKey: string): Mission[] {
  const seed = weekKey.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = [...MISSION_POOL].sort((a, b) => {
    const ha = (seed * a.id.length * 17) % 997;
    const hb = (seed * b.id.length * 17) % 997;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

async function loadData(): Promise<WeeklyMissionsData | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveData(data: WeeklyMissionsData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

async function addBonusXP(amount: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(XP_KEY);
    const current = raw ? JSON.parse(raw).xp ?? 0 : 0;
    await AsyncStorage.setItem(XP_KEY, JSON.stringify({ xp: current + amount }));
  } catch {}
}

export async function getBonusXP(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(XP_KEY);
    return raw ? JSON.parse(raw).xp ?? 0 : 0;
  } catch {
    return 0;
  }
}

export function useWeeklyMissions({
  totalMessagesSentThisWeek = 0,
  differentCharactersThisWeek = 0,
  chatDaysThisWeek = 0,
  maxStreakThisWeek = 0,
  giftsThisWeek = 0,
  newCharsThisWeek = 0,
}: {
  totalMessagesSentThisWeek?: number;
  differentCharactersThisWeek?: number;
  chatDaysThisWeek?: number;
  maxStreakThisWeek?: number;
  giftsThisWeek?: number;
  newCharsThisWeek?: number;
}) {
  const [missionsData, setMissionsData] = useState<WeeklyMissionsData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const weekKey = getWeekKey();
      const stored = await loadData();
      let data: WeeklyMissionsData;

      if (!stored || stored.weekKey !== weekKey) {
        const missions = generateMissionsForWeek(weekKey);
        const progress: Record<string, MissionProgress> = {};
        for (const m of missions) {
          progress[m.id] = { missionId: m.id, progress: 0, completed: false, rewardClaimed: false };
        }
        data = { weekKey, missions, progress };
        await saveData(data);
      } else {
        data = stored;
      }

      if (mounted) {
        setMissionsData(data);
        setLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getMissionProgress = useCallback((mission: Mission): number => {
    switch (mission.type) {
      case "send_messages": return Math.min(totalMessagesSentThisWeek, mission.target);
      case "different_characters": return Math.min(differentCharactersThisWeek, mission.target);
      case "chat_days": return Math.min(chatDaysThisWeek, mission.target);
      case "streak_days": return Math.min(maxStreakThisWeek, mission.target);
      case "send_gift": return Math.min(giftsThisWeek, mission.target);
      case "new_character": return Math.min(newCharsThisWeek, mission.target);
      default: return 0;
    }
  }, [totalMessagesSentThisWeek, differentCharactersThisWeek, chatDaysThisWeek, maxStreakThisWeek, giftsThisWeek, newCharsThisWeek]);

  const isClaimed = useCallback((missionId: string): boolean => {
    return !!missionsData?.progress[missionId]?.rewardClaimed;
  }, [missionsData]);

  const claimReward = useCallback(async (missionId: string) => {
    if (!missionsData) return;
    const mission = missionsData.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const already = missionsData.progress[missionId]?.rewardClaimed;
    if (already) return;

    const updated = {
      ...missionsData,
      progress: {
        ...missionsData.progress,
        [missionId]: {
          ...missionsData.progress[missionId],
          rewardClaimed: true,
        },
      },
    };
    await saveData(updated);
    await addBonusXP(mission.reward);
    setMissionsData(updated);
  }, [missionsData]);

  const missions = missionsData?.missions ?? [];
  const completedCount = missions.filter((m) => getMissionProgress(m) >= m.target).length;
  const claimedCount = missions.filter((m) => !!missionsData?.progress[m.id]?.rewardClaimed).length;
  const totalReward = missions.reduce((acc, m) => {
    const progress = getMissionProgress(m);
    const claimed = missionsData?.progress[m.id]?.rewardClaimed;
    if (progress >= m.target && !claimed) acc += m.reward;
    return acc;
  }, 0);

  return {
    missions,
    getMissionProgress,
    isClaimed,
    completedCount,
    claimedCount,
    totalMissions: missions.length,
    totalReward,
    loaded,
    claimReward,
    weekKey: missionsData?.weekKey ?? getWeekKey(),
  };
}
