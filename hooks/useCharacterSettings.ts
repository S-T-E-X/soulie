import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "soulie_char_settings_v1";

export type VoiceTone = "warm" | "playful" | "serious" | "mysterious" | "energetic";

export type AutoMessageTimes = {
  morning: boolean;
  noon: boolean;
  night: boolean;
};

export type CharacterSettings = {
  customName?: string;
  traits: string[];
  memories: string[];
  autoMessageEnabled: boolean;
  autoMessageTimes: AutoMessageTimes;
  voiceTone?: VoiceTone;
  isPremium: boolean;
};

type AllSettings = Record<string, CharacterSettings>;

const defaultSettings = (): CharacterSettings => ({
  customName: undefined,
  traits: [],
  memories: [],
  autoMessageEnabled: true,
  autoMessageTimes: { morning: true, noon: true, night: true },
  voiceTone: undefined,
  isPremium: false,
});

async function loadAllSettings(): Promise<AllSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveAllSettings(all: AllSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function useCharacterSettings(characterId: string) {
  const [settings, setSettings] = useState<CharacterSettings>(defaultSettings());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadAllSettings().then((all) => {
      if (mounted) {
        const stored = all[characterId] ?? {};
        setSettings({ ...defaultSettings(), ...stored, autoMessageEnabled: true });
        setIsLoaded(true);
      }
    });
    return () => { mounted = false; };
  }, [characterId]);

  const updateSettings = useCallback(async (partial: Partial<CharacterSettings>) => {
    const all = await loadAllSettings();
    const updated: CharacterSettings = {
      ...defaultSettings(),
      ...(all[characterId] ?? {}),
      ...partial,
      autoMessageEnabled: true,
    };
    all[characterId] = updated;
    await saveAllSettings(all);
    setSettings(updated);
  }, [characterId]);

  const addMemory = useCallback(async (memory: string) => {
    const all = await loadAllSettings();
    const current = all[characterId] ?? defaultSettings();
    const newMemories = [memory, ...current.memories].slice(0, 6);
    const updated = { ...current, memories: newMemories };
    all[characterId] = updated;
    await saveAllSettings(all);
    setSettings(updated);
  }, [characterId]);

  const removeMemory = useCallback(async (index: number) => {
    const all = await loadAllSettings();
    const current = all[characterId] ?? defaultSettings();
    const newMemories = current.memories.filter((_, i) => i !== index);
    const updated = { ...current, memories: newMemories };
    all[characterId] = updated;
    await saveAllSettings(all);
    setSettings(updated);
  }, [characterId]);

  return { settings, isLoaded, updateSettings, addMemory, removeMemory };
}
