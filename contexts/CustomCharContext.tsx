import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Character } from "@/constants/characters";

const STORAGE_KEY = "soulie_custom_chars_v1";

export type CustomCharacter = Character & {
  isCustom: true;
  ownerId: string;
  createdAt: number;
};

type CustomCharContextType = {
  customChars: CustomCharacter[];
  addCustomChar: (char: Omit<CustomCharacter, "id" | "createdAt">) => Promise<void>;
  removeCustomChar: (id: string) => Promise<void>;
  getMyChars: (userId: string) => CustomCharacter[];
};

const CustomCharContext = createContext<CustomCharContextType>({
  customChars: [],
  addCustomChar: async () => {},
  removeCustomChar: async () => {},
  getMyChars: () => [],
});

export function CustomCharProvider({ children }: { children: React.ReactNode }) {
  const [customChars, setCustomChars] = useState<CustomCharacter[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setCustomChars(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const persist = useCallback(async (chars: CustomCharacter[]) => {
    setCustomChars(chars);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
  }, []);

  const addCustomChar = useCallback(async (char: Omit<CustomCharacter, "id" | "createdAt">) => {
    const newChar: CustomCharacter = {
      ...char,
      id: "custom_" + Date.now().toString() + Math.random().toString(36).substr(2, 6),
      createdAt: Date.now(),
    };
    await persist([...customChars, newChar]);
  }, [customChars, persist]);

  const removeCustomChar = useCallback(async (id: string) => {
    await persist(customChars.filter((c) => c.id !== id));
  }, [customChars, persist]);

  const getMyChars = useCallback((userId: string) => {
    return customChars.filter((c) => c.ownerId === userId);
  }, [customChars]);

  return (
    <CustomCharContext.Provider value={{ customChars, addCustomChar, removeCustomChar, getMyChars }}>
      {children}
    </CustomCharContext.Provider>
  );
}

export function useCustomChars() {
  return useContext(CustomCharContext);
}
