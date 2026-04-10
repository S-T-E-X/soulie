import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "soulie_quota_v3";
export const QUOTA_LIMIT = 10;
const QUOTA_WINDOW_MS = 6 * 60 * 60 * 1000;

type QuotaData = {
  windowStart: number;
  count: number;
  bonusMessages?: number;
};

function isWindowExpired(windowStart: number): boolean {
  return Date.now() >= windowStart + QUOTA_WINDOW_MS;
}

async function loadQuota(): Promise<QuotaData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { windowStart: 0, count: 0, bonusMessages: 0 };
    const parsed: QuotaData = JSON.parse(raw);
    if (isWindowExpired(parsed.windowStart)) {
      return { windowStart: 0, count: 0, bonusMessages: 0 };
    }
    return { ...parsed, bonusMessages: parsed.bonusMessages ?? 0 };
  } catch {
    return { windowStart: 0, count: 0, bonusMessages: 0 };
  }
}

export function useDailyQuota(isVip: boolean = false) {
  const [quota, setQuota] = useState<QuotaData>({ windowStart: 0, count: 0, bonusMessages: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadQuota().then((q) => {
      if (mounted) { setQuota(q); setLoaded(true); }
    });
    return () => { mounted = false; };
  }, []);

  const isExpired = isWindowExpired(quota.windowStart);
  const count = isExpired ? 0 : quota.count;
  const bonus = isExpired ? 0 : (quota.bonusMessages ?? 0);
  const totalLimit = isVip ? 99999 : QUOTA_LIMIT + bonus;
  const remaining = isVip ? 99999 : Math.max(0, totalLimit - count);
  const canSend = isVip || remaining > 0;
  const resetTime = quota.windowStart > 0 ? quota.windowStart + QUOTA_WINDOW_MS : 0;

  const markMessageSent = useCallback(async () => {
    const now = Date.now();
    const expired = isWindowExpired(quota.windowStart);
    const newWindowStart = expired || quota.windowStart === 0 ? now : quota.windowStart;
    const newCount = expired ? 1 : quota.count + 1;
    const newData: QuotaData = {
      windowStart: newWindowStart,
      count: newCount,
      bonusMessages: expired ? 0 : (quota.bonusMessages ?? 0),
    };
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); } catch {}
    setQuota(newData);
  }, [quota]);

  const addBonusMessages = useCallback(async (count: number) => {
    const current = isWindowExpired(quota.windowStart)
      ? { windowStart: 0, count: 0, bonusMessages: 0 }
      : quota;
    const newData: QuotaData = {
      windowStart: current.windowStart,
      count: current.count,
      bonusMessages: (current.bonusMessages ?? 0) + count,
    };
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); } catch {}
    setQuota(newData);
  }, [quota]);

  const getResetCountdown = useCallback((): string => {
    if (resetTime <= 0) return "6s 0dk";
    const diff = resetTime - Date.now();
    if (diff <= 0) return "0s 0dk";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}s ${m}dk`;
  }, [resetTime]);

  return {
    canSend,
    remaining,
    used: count,
    DAILY_LIMIT: QUOTA_LIMIT,
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
