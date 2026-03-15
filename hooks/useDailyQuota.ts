import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "soulie_daily_quota_v1";
const DAILY_LIMIT = 15;

type QuotaData = {
  date: string;
  count: number;
  bonusMessages?: number;
};

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getResetTime(): number {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

async function loadQuota(): Promise<QuotaData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: "", count: 0, bonusMessages: 0 };
    const parsed: QuotaData = JSON.parse(raw);
    if (parsed.date !== getToday()) return { date: getToday(), count: 0, bonusMessages: 0 };
    return { ...parsed, bonusMessages: parsed.bonusMessages ?? 0 };
  } catch {
    return { date: getToday(), count: 0, bonusMessages: 0 };
  }
}

export function useDailyQuota(isVip: boolean = false) {
  const [quota, setQuota] = useState<QuotaData>({ date: getToday(), count: 0, bonusMessages: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadQuota().then((q) => {
      if (mounted) {
        setQuota(q);
        setLoaded(true);
      }
    });
    return () => { mounted = false; };
  }, []);

  const today = getToday();
  const used = quota.date === today ? quota.count : 0;
  const bonus = quota.date === today ? (quota.bonusMessages ?? 0) : 0;
  const totalLimit = isVip ? 999 : DAILY_LIMIT + bonus;
  const remaining = isVip ? 999 : Math.max(0, totalLimit - used);
  const canSend = isVip || remaining > 0;
  const resetTime = getResetTime();

  const markMessageSent = useCallback(async () => {
    const today2 = getToday();
    const newCount = quota.date === today2 ? quota.count + 1 : 1;
    const newData: QuotaData = { date: today2, count: newCount, bonusMessages: quota.bonusMessages ?? 0 };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch {}
    setQuota(newData);
  }, [quota]);

  const addBonusMessages = useCallback(async (count: number) => {
    const today2 = getToday();
    const current = quota.date === today2 ? quota : { date: today2, count: 0, bonusMessages: 0 };
    const newData: QuotaData = {
      date: today2,
      count: current.count,
      bonusMessages: (current.bonusMessages ?? 0) + count,
    };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch {}
    setQuota(newData);
  }, [quota]);

  const getResetCountdown = useCallback((): string => {
    const diff = resetTime - Date.now();
    if (diff <= 0) return "0s 0dk";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}s ${m}dk`;
  }, [resetTime]);

  return {
    canSend,
    remaining,
    used,
    DAILY_LIMIT,
    totalLimit,
    bonus,
    isVip,
    loaded,
    markMessageSent,
    addBonusMessages,
    getResetCountdown,
    resetTime,
  };
}
