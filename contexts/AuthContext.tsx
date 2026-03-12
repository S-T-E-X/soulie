import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserLanguage = "tr" | "en";
export type UserGender = "male" | "female" | "other" | "prefer_not_to_say";

export type User = {
  id: string;
  name: string;
  username: string;
  email?: string;
  language: UserLanguage;
  birthdate?: string;
  gender?: UserGender;
  hobbies?: string[];
  bio?: string;
  profilePhoto?: string;
  onboardingComplete: boolean;
};

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (partial: Partial<User> & { name: string }) => Promise<void>;
  updateProfile: (partial: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_STORAGE_KEY = "lumina_auth_user";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Auth init failed", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (partial: Partial<User> & { name: string }) => {
    const newUser: User = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name: partial.name,
      username: partial.name.toLowerCase().replace(/\s+/g, "_"),
      email: partial.email,
      language: partial.language ?? "tr",
      birthdate: partial.birthdate,
      gender: partial.gender,
      hobbies: partial.hobbies ?? [],
      bio: partial.bio ?? "",
      profilePhoto: partial.profilePhoto,
      onboardingComplete: partial.onboardingComplete ?? false,
    };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
  }, []);

  const updateProfile = useCallback(async (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, updateProfile, logout }),
    [user, isLoading, login, updateProfile, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
