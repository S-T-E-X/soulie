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
import { getApiUrl } from "@/lib/query-client";

export type UserLanguage = "en" | "tr" | "de" | "zh" | "ko" | "es" | "ru";
export type UserGender = "male" | "female" | "other" | "prefer_not_to_say";

const ADMIN_EMAILS = ["admin@soulie.app", "soulie_admin@admin.com"];
const ADMIN_USERNAMES = ["yusuf"];

export type User = {
  id: string;
  userId: string;
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
  vipExpiry?: number;
  vipPlan?: "weekly" | "monthly" | "yearly";
};

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isVipActive: boolean;
  login: (partial: Partial<User> & { name: string }) => Promise<void>;
  updateProfile: (partial: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  grantAdminAccess: () => Promise<void>;
  activateVip: (plan: "weekly" | "monthly" | "yearly") => Promise<void>;
}

const AUTH_STORAGE_KEY = "lumina_auth_user";
const USERS_DB_KEY = "soulie_users_db_v1";

async function syncUserToServer(user: User) {
  try {
    const url = new URL("/api/users/sync", getApiUrl());
    await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  } catch {}
}

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
          const parsed = JSON.parse(stored) as User;
          if (!parsed.userId) {
            parsed.userId = String(Math.floor(100000 + Math.random() * 900000));
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
          }
          setUser(parsed);
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
      userId: String(Math.floor(100000 + Math.random() * 900000)),
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
    try {
      const existing = await AsyncStorage.getItem(USERS_DB_KEY);
      const users: User[] = existing ? JSON.parse(existing) : [];
      const idx = users.findIndex((u) => u.id === newUser.id);
      if (idx >= 0) users[idx] = newUser; else users.push(newUser);
      await AsyncStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    } catch {}
    syncUserToServer(newUser);
    setUser(newUser);
  }, []);

  const updateProfile = useCallback(async (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      AsyncStorage.getItem(USERS_DB_KEY).then((existing) => {
        const users: User[] = existing ? JSON.parse(existing) : [];
        const idx = users.findIndex((u) => u.id === updated.id);
        if (idx >= 0) users[idx] = updated; else users.push(updated);
        AsyncStorage.setItem(USERS_DB_KEY, JSON.stringify(users)).catch(() => {});
      }).catch(() => {});
      syncUserToServer(updated);
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

  const activateVip = useCallback(async (plan: "weekly" | "monthly" | "yearly") => {
    const durations: Record<string, number> = { weekly: 7, monthly: 30, yearly: 365 };
    const days = durations[plan] ?? 30;
    const expiry = Date.now() + days * 24 * 60 * 60 * 1000;
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, isVip: true, vipExpiry: expiry, vipPlan: plan };
      AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      AsyncStorage.getItem(USERS_DB_KEY).then((existing) => {
        const users: User[] = existing ? JSON.parse(existing) : [];
        const idx = users.findIndex((u) => u.id === updated.id);
        if (idx >= 0) users[idx] = updated; else users.push(updated);
        AsyncStorage.setItem(USERS_DB_KEY, JSON.stringify(users)).catch(() => {});
      }).catch(() => {});
      return updated;
    });
  }, []);

  const isVipActive = !!user && !!user.isAdmin
    ? true
    : !!user && !!user.isVip && (!user.vipExpiry || user.vipExpiry > Date.now());

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, isVipActive, login, updateProfile, logout, deleteAccount, grantAdminAccess, activateVip }),
    [user, isLoading, isVipActive, login, updateProfile, logout, deleteAccount, grantAdminAccess, activateVip]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
