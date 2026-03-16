import AsyncStorage from "@react-native-async-storage/async-storage";

const MUTED_KEY = "soulie_muted_chars_v1";

export async function getMutedChars(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(MUTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function muteChar(charId: string): Promise<void> {
  try {
    const muted = await getMutedChars();
    if (!muted.includes(charId)) {
      await AsyncStorage.setItem(MUTED_KEY, JSON.stringify([...muted, charId]));
    }
  } catch {}
}

export async function unmuteChar(charId: string): Promise<void> {
  try {
    const muted = await getMutedChars();
    await AsyncStorage.setItem(MUTED_KEY, JSON.stringify(muted.filter((id) => id !== charId)));
  } catch {}
}
