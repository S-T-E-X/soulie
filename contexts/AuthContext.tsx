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

type User = {
  id: string;
  name: string;
  username: string;
};

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (name: string, username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_STORAGE_KEY = "lumina_auth_user";
const USERS_STORAGE_KEY = "lumina_users_db";

const AuthContext = createContext<AuthContextValue | null>(null);

function genId() {
  return `u-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY).then((stored) => {
      if (stored) setUser(JSON.parse(stored));
      setIsLoading(false);
    });
  }, []);

  const register = useCallback(async (name: string, username: string, password: string) => {
    const usersRaw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    const users: Record<string, { id: string; name: string; username: string; password: string }> =
      usersRaw ? JSON.parse(usersRaw) : {};

    if (users[username]) {
      throw new Error("Bu kullanıcı adı zaten alınmış.");
    }

    const newUser = { id: genId(), name, username, password };
    users[username] = newUser;
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    const sessionUser: User = { id: newUser.id, name, username };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const usersRaw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    const users: Record<string, { id: string; name: string; username: string; password: string }> =
      usersRaw ? JSON.parse(usersRaw) : {};

    const found = users[username];
    if (!found || found.password !== password) {
      throw new Error("Kullanıcı adı veya şifre hatalı.");
    }

    const sessionUser: User = { id: found.id, name: found.name, username };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, register, login, logout }),
    [user, isLoading, register, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
