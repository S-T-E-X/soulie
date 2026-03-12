import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "soulie_daily_quota_v1";
const DAILY_LIMIT = 15;
const IS_VIP = false;

type QuotaData = {
  date: string;
  count: number;
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
    if (!raw) return { date: "", count: 0 };
    const parsed: QuotaData = JSON.parse(raw);
    if (parsed.date !== getToday()) return { date: getToday(), count: 0 };
    return parsed;
  } catch {
    return { date: getToday(), count: 0 };
  }
}

export function useDailyQuota() {
  const [quota, setQuota] = useState<QuotaData>({ date: getToday(), count: 0 });
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

  const used = quota.date === getToday() ? quota.count : 0;
  const remaining = IS_VIP ? 999 : Math.max(0, DAILY_LIMIT - used);
  const canSend = IS_VIP || remaining > 0;
  const resetTime = getResetTime();

  const markMessageSent = useCallback(async () => {
    const today = getToday();
    const newCount = quota.date === today ? quota.count + 1 : 1;
    const newData: QuotaData = { date: today, count: newCount };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch {}
    setQuota(newData);
  }, [quota]);

  const getResetCountdown = useCallback((): string => {
    const diff = resetTime - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}s ${m}dk`;
  }, [resetTime]);

  return {
    canSend,
    remaining,
    used,
    DAILY_LIMIT,
    isVip: IS_VIP,
    loaded,
    markMessageSent,
    getResetCountdown,
    resetTime,
  };
}
