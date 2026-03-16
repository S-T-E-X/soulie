import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const AD_KEY = "soulie_last_ad_watch_v1";

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export async function hasWatchedAdToday(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const val = await AsyncStorage.getItem(AD_KEY);
    return val === todayKey();
  } catch {
    return false;
  }
}

export async function markAdWatched(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await AsyncStorage.setItem(AD_KEY, todayKey());
  } catch {}
}
