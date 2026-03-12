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

const ADMIN_EMAILS = ["admin@soulie.app", "soulie_admin@admin.com"];
const ADMIN_USERNAMES = ["yusuf"];

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
  isAdmin?: boolean;
  isVip?: boolean;
};

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (partial: Partial<User> & { name: string }) => Promise<void>;
  updateProfile: (partial: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  grantAdminAccess: () => Promise<void>;
}

const AUTH_STORAGE_KEY = "lumina_auth_user";

const ALL_STORAGE_KEYS = [
  "lumina_auth_user",
  "soulie_conversations_v2",
  "soulie_archive_msgs_v1",
  "soulie_char_settings_v1",
  "soulie_coins_v1",
  "soulie_inventory_v1",
  "soulie_streaks_v1",
  "soulie_daily_quota_v1",
  "soulie_weekly_missions_v1",
  "soulie_bonus_xp_v1",
  "soulie_tarot_v1",
  "soulie_feedback_v1",
];

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
    const username = partial.name.toLowerCase().replace(/\s+/g, "_");
    const isAdmin = ADMIN_EMAILS.includes(partial.email?.toLowerCase() ?? "") || ADMIN_USERNAMES.includes(username);
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
      isAdmin,
      isVip: partial.isVip ?? false,
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

  const deleteAccount = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(ALL_STORAGE_KEYS);
    } catch {}
    setUser(null);
  }, []);

  const grantAdminAccess = useCallback(async () => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isAdmin: true };
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, updateProfile, logout, deleteAccount, grantAdminAccess }),
    [user, isLoading, login, updateProfile, logout, deleteAccount, grantAdminAccess]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
