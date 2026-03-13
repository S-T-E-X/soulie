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

const SETTINGS_KEY = "soulie_settings_v1";

export type Theme = "light" | "dark";

export const LIGHT_COLORS = {
  accent: "#007AFF",
  background: "#F2F2F7",
  backgroundGradient: ["#E8EFF8", "#F2F2F7", "#EEF1F8"] as [string, string, string],
  surface: "rgba(255,255,255,0.82)",
  surfaceStrong: "rgba(255,255,255,0.95)",
  card: "rgba(255,255,255,0.85)",
  border: "rgba(255,255,255,0.45)",
  borderSubtle: "rgba(0,0,0,0.06)",
  divider: "rgba(0,0,0,0.05)",
  inputBg: "rgba(0,0,0,0.04)",
  statusBar: "dark-content" as "dark-content" | "light-content",
  tabBar: {
    bg: "rgba(248,248,252,0.95)",
    border: "rgba(0,0,0,0.08)",
    activeTint: "#007AFF",
    inactiveTint: "#C7C7CC",
  },
  text: {
    primary: "#1D1D1F",
    secondary: "#6B6B6E",
    tertiary: "#AEAEB2",
    inverse: "#FFFFFF",
  },
  userBubble: { from: "#007AFF", to: "#0059C4" },
  aiBubble: "rgba(255,255,255,0.85)",
  blobA: "rgba(0,122,255,0.07)",
  blobB: "rgba(88,86,214,0.05)",
};

export const DARK_COLORS = {
  accent: "#0A84FF",
  background: "#0A0F1E",
  backgroundGradient: ["#0D0D1E", "#0A1525", "#0D1020"] as [string, string, string],
  surface: "rgba(28,28,48,0.88)",
  surfaceStrong: "rgba(35,35,58,0.97)",
  card: "rgba(28,28,48,0.92)",
  border: "rgba(255,255,255,0.14)",
  borderSubtle: "rgba(255,255,255,0.07)",
  divider: "rgba(255,255,255,0.06)",
  inputBg: "rgba(255,255,255,0.06)",
  statusBar: "light-content" as "dark-content" | "light-content",
  tabBar: {
    bg: "rgba(10,15,30,0.97)",
    border: "rgba(255,255,255,0.08)",
    activeTint: "#0A84FF",
    inactiveTint: "#636366",
  },
  text: {
    primary: "#F5F5F7",
    secondary: "#98989D",
    tertiary: "#6C6C70",
    inverse: "#000000",
  },
  userBubble: { from: "#007AFF", to: "#0059C4" },
  aiBubble: "rgba(32,32,54,0.88)",
  blobA: "rgba(0,122,255,0.06)",
  blobB: "rgba(88,86,214,0.05)",
};

export type ThemeColors = typeof LIGHT_COLORS;

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const themeRef = React.useRef<Theme>("light");
  themeRef.current = theme;

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (cancelled) return;
      if (raw) {
        try {
          const s = JSON.parse(raw);
          if (s.darkTheme) setTheme("dark");
        } catch {}
      }
    });
    return () => { cancelled = true; };
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = themeRef.current === "light" ? "dark" : "light";
    setTheme(next);
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      const s = raw ? JSON.parse(raw) : {};
      s.darkTheme = next === "dark";
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    });
  }, []);

  const isDark = theme === "dark";
  const colors: ThemeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const value = useMemo(
    () => ({ theme, isDark, colors, toggleTheme }),
    [theme, isDark, colors, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
