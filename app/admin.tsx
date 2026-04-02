import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/contexts/AuthContext";
import { useChatContext } from "@/contexts/ChatContext";
import { CHARACTERS } from "@/constants/characters";
import { GIFTS, useGifts } from "@/contexts/GiftContext";
import { getApiUrl } from "@/lib/query-client";

const FEEDBACK_KEY = "soulie_feedback_v1";
const COINS_KEY = "soulie_coins_v1";
const INVENTORY_KEY = "soulie_inventory_v1";
const QUOTA_KEY = "soulie_daily_quota_v1";
const MISSIONS_KEY = "soulie_weekly_missions_v1";
const CHAR_SETTINGS_KEY = "soulie_char_settings_v1";
const STREAKS_KEY = "soulie_streaks_v1";

const ACCENT = "#7C5CFC";
const BG = "#0F0F1A";
const CARD = "#1A1A2E";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT_PRI = "#FFFFFF";
const TEXT_SEC = "rgba(255,255,255,0.55)";
const TEXT_TER = "rgba(255,255,255,0.3)";

type TopSection = "app" | "user";
type AppTab = "genel" | "ai" | "engagement";
type UserTab = "profil" | "analitik" | "ekonomi" | "hafiza";

type AnalyticsData = {
  daily: { date: string; count: string }[];
  weekly: { week: string; count: string }[];
  monthly: { month: string; count: string }[];
  totals: { total: number; vip: number; today: number; thisWeek: number; thisMonth: number };
};

type DbUser = {
  id: string;
  user_id: string;
  name: string;
  username: string;
  email?: string;
  language: string;
  gender?: string;
  birthdate?: string;
  is_admin: boolean;
  is_vip: boolean;
  vip_plan?: string;
  platform?: string;
  ip_address?: string;
  user_agent?: string;
  country?: string;
  city?: string;
  onboarding_complete: boolean;
  total_xp?: number;
  level?: number;
  created_at?: string;
  last_seen?: string;
  synced_at?: number;
};

type UserEvent = {
  id: number;
  event_type: string;
  screen?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  platform?: string;
  user_agent?: string;
  created_at: string;
};

type FeedbackEntry = {
  id: string;
  category: string;
  rating: number;
  text: string;
  timestamp: number;
};

const CAT_LABELS: Record<string, string> = { bug: "Bug", suggestion: "Suggestion", praise: "Praise", other: "Other" };
const CAT_COLORS: Record<string, string> = { bug: "#FF3B30", suggestion: "#007AFF", praise: "#34C759", other: "#8E8E93" };

function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function SectionTitle({ title, icon, color = ACCENT }: { title: string; icon: string; color?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={[styles.sectionIcon, { backgroundColor: color + "22" }]}>
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

function StatGrid({ items }: { items: { label: string; value: string; color: string; icon: string }[] }) {
  return (
    <View style={styles.statGrid}>
      {items.map((item, i) => (
        <View key={i} style={styles.statCell}>
          <View style={[styles.statIcon, { backgroundColor: item.color + "22" }]}>
            <Feather name={item.icon as any} size={16} color={item.color} />
          </View>
          <Text style={styles.statVal}>{item.value}</Text>
          <Text style={styles.statLbl}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function InfoRow({ label, value, mono, last }: { label: string; value: string; mono?: boolean; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && { fontFamily: "Inter_400Regular", fontSize: 11 }]} numberOfLines={1} ellipsizeMode="middle">{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

type BarPeriod = "daily" | "weekly" | "monthly";

function RegistrationChart({ data }: { data: AnalyticsData | null }) {
  const [period, setPeriod] = React.useState<BarPeriod>("daily");

  const rows = React.useMemo(() => {
    if (!data) return [];
    const raw = period === "daily" ? data.daily : period === "weekly" ? data.weekly : data.monthly;
    return raw.map(r => ({
      label: period === "daily"
        ? new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : period === "weekly"
        ? new Date((r as any).week).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : new Date((r as any).month).toLocaleDateString("en-US", { month: "short" }),
      count: parseInt(r.count as any) || 0,
    })).slice(-12);
  }, [data, period]);

  const maxVal = Math.max(...rows.map(r => r.count), 1);

  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
        {(["daily", "weekly", "monthly"] as BarPeriod[]).map(p => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[
              { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
              period === p && { backgroundColor: ACCENT + "30" }
            ]}
          >
            <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: period === p ? ACCENT : TEXT_SEC }}>
              {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : "Monthly"}
            </Text>
          </Pressable>
        ))}
      </View>
      {rows.length === 0 ? (
        <View style={{ alignItems: "center", padding: 20 }}>
          <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT_TER }}>No data available</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 80 }}>
          {rows.map((r, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: TEXT_TER }}>{r.count > 0 ? r.count : ""}</Text>
              <View style={{ width: "100%", height: 56, justifyContent: "flex-end" }}>
                <View style={{
                  width: "100%",
                  height: Math.max(3, Math.round((r.count / maxVal) * 52)),
                  backgroundColor: r.count > 0 ? ACCENT : "rgba(255,255,255,0.08)",
                  borderRadius: 3,
                }} />
              </View>
              <Text numberOfLines={1} style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: TEXT_TER }}>{r.label}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { user, updateProfile } = useAuth();
  const { conversations } = useChatContext();
  const { coins, addCoins: addCoinsCtx } = useGifts();

  const [section, setSection] = useState<TopSection>("app");
  const [appTab, setAppTab] = useState<AppTab>("genel");
  const [userTab, setUserTab] = useState<UserTab>("profil");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<DbUser[]>([]);
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [inventory, setInventory] = useState<{ giftId: string; quantity: number }[]>([]);
  const [quota, setQuota] = useState<{ count: number; bonusMessages: number } | null>(null);
  const [charSettings, setCharSettings] = useState<Record<string, any>>({});
  const [streaks, setStreaks] = useState<Record<string, any>>({});
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [coinInput, setCoinInput] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [secretTaps, setSecretTaps] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [levelInput, setLevelInput] = useState("");
  const [xpInput, setXpInput] = useState("");
  const [levelSaving, setLevelSaving] = useState(false);

  const selectedDbUser = usersList.find(u => u.id === selectedUserId);
  const selectedUser = selectedDbUser ?? (user ? {
    id: user.id, user_id: user.userId, name: user.name, username: user.username,
    email: user.email, language: user.language, gender: user.gender,
    birthdate: user.birthdate, is_admin: !!user.isAdmin, is_vip: !!user.isVip,
    vip_plan: user.vipPlan, onboarding_complete: user.onboardingComplete,
  } as DbUser : undefined);

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadAll();
  }, [user?.isAdmin]);

  const loadAll = async () => {
    try {
      const [fb, inv, q, cs, sk] = await Promise.all([
        AsyncStorage.getItem(FEEDBACK_KEY),
        AsyncStorage.getItem(INVENTORY_KEY),
        AsyncStorage.getItem(QUOTA_KEY),
        AsyncStorage.getItem(CHAR_SETTINGS_KEY),
        AsyncStorage.getItem(STREAKS_KEY),
      ]);
      if (fb) setFeedbackList(JSON.parse(fb));
      if (inv) setInventory(JSON.parse(inv));
      if (q) setQuota(JSON.parse(q));
      if (cs) setCharSettings(JSON.parse(cs));
      if (sk) setStreaks(JSON.parse(sk));

      try {
        const url = new URL("/api/admin/users", getApiUrl());
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          const dbUsers: DbUser[] = data.users ?? [];
          setUsersList(dbUsers);
        }
      } catch {}

      try {
        const url = new URL("/api/admin/analytics", getApiUrl());
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
        }
      } catch {}
    } catch {}
    setLoaded(true);
    fetchGlobalPrompt();
  };

  const loadUserEvents = async (userId: string) => {
    setEventsLoading(true);
    try {
      const url = new URL(`/api/admin/events/${userId}`, getApiUrl());
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setUserEvents(data.events ?? []);
      }
    } catch {}
    setEventsLoading(false);
  };

  const fetchGlobalPrompt = async () => {
    try {
      const url = new URL("/api/admin/system-prompt", getApiUrl());
      const res = await fetch(url.toString());
      const data = await res.json();
      setGlobalPrompt(data.prompt ?? "");
    } catch {}
  };

  const saveGlobalPrompt = async () => {
    setPromptLoading(true);
    try {
      const url = new URL("/api/admin/system-prompt", getApiUrl());
      await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: globalPrompt }),
      });
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2000);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not save.");
    } finally {
      setPromptLoading(false);
    }
  };

  const resetGlobalPrompt = () => {
    Alert.alert("Reset", "Reset the global system prompt?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset", style: "destructive", onPress: async () => {
          try {
            const url = new URL("/api/admin/reset-system-prompt", getApiUrl());
            await fetch(url.toString(), { method: "POST" });
            setGlobalPrompt("");
          } catch {}
        }
      }
    ]);
  };

  const toggleVIP = async () => {
    const newVip = !user?.isVip;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile({ isVip: newVip });
  };

  const toggleSelectedUserVip = async () => {
    if (!selectedUserId) return;
    const target = usersList.find(u => u.id === selectedUserId);
    if (!target) return;
    const newVip = !target.is_vip;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = { ...target, is_vip: newVip };
    setUsersList(usersList.map(u => u.id === selectedUserId ? updated : u));
    if (selectedUserId === user?.id) {
      await updateProfile({ isVip: newVip });
    }
  };

  useEffect(() => {
    if (selectedUser) {
      setLevelInput(String(selectedUser.level ?? 1));
      setXpInput(String(selectedUser.total_xp ?? 0));
    }
  }, [selectedUserId]);

  const saveUserLevel = async () => {
    if (!selectedUser) return;
    const lvl = parseInt(levelInput, 10);
    const xp = parseInt(xpInput, 10);
    if (isNaN(lvl) || isNaN(xp) || lvl < 1 || lvl > 100 || xp < 0) {
      Alert.alert("Invalid", "Level must be 1-100, XP must be ≥ 0");
      return;
    }
    setLevelSaving(true);
    try {
      const url = new URL(`/api/admin/users/${selectedUser.id}/level`, getApiUrl());
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: lvl, totalXp: xp }),
      });
      if (res.ok) {
        setUsersList(prev => prev.map(u => u.id === selectedUser.id ? { ...u, level: lvl, total_xp: xp } : u));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Saved", `Level set to ${lvl}, XP set to ${xp}`);
      } else {
        Alert.alert("Error", "Failed to save level");
      }
    } catch {
      Alert.alert("Error", "Network error");
    }
    setLevelSaving(false);
  };

  const addCoinsAdmin = async () => {
    const amount = parseInt(coinInput, 10);
    if (isNaN(amount) || amount <= 0) { Alert.alert("Invalid amount"); return; }
    await addCoinsCtx(amount);
    setCoinInput("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resetQuota = () => {
    Alert.alert("Reset Quota", "Reset today's message quota?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset", onPress: async () => {
          const today = new Date().toISOString().split("T")[0];
          await AsyncStorage.setItem(QUOTA_KEY, JSON.stringify({ date: today, count: 0, bonusMessages: 0 }));
          setQuota({ count: 0, bonusMessages: 0 });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };

  const clearMemory = (charId: string) => {
    const charName = CHARACTERS.find(c => c.id === charId)?.name ?? charId;
    Alert.alert("Clear Memory", `Delete AI memories for ${charName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          const updatedSettings = { ...charSettings };
          if (updatedSettings[charId]) updatedSettings[charId] = { ...updatedSettings[charId], memories: [] };
          await AsyncStorage.setItem(CHAR_SETTINGS_KEY, JSON.stringify(updatedSettings));
          setCharSettings(updatedSettings);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };

  const sendNotif = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) { Alert.alert("Title and message required"); return; }
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission Required", "Notification permission denied."); return; }
      await Notifications.scheduleNotificationAsync({
        content: { title: notifTitle, body: notifBody, sound: true },
        trigger: null,
      });
      setNotifTitle(""); setNotifBody("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Sent", "Notification delivered successfully.");
    } catch { Alert.alert("Error", "Could not send notification."); }
  };

  const clearFeedback = () => {
    Alert.alert("Delete", "Delete all feedback entries?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await AsyncStorage.removeItem(FEEDBACK_KEY); setFeedbackList([]); } }
    ]);
  };

  if (!user?.isAdmin) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Feather name="lock" size={40} color={TEXT_TER} />
        <Text style={[styles.sectionTitleText, { marginTop: 12, color: TEXT_SEC, textTransform: "none", fontSize: 16 }]}>Access Denied</Text>
        <Pressable onPress={() => router.back()} style={styles.backCenterBtn}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: ACCENT }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const totalMessages = conversations.reduce((a, c) => a + c.messages.length, 0);
  const userMsgCount = conversations.reduce((a, c) => a + c.messages.filter(m => m.role === "user").length, 0);
  const charUsage: Record<string, number> = {};
  conversations.forEach(c => { charUsage[c.characterId] = (charUsage[c.characterId] ?? 0) + c.messages.filter(m => m.role === "user").length; });
  const topChar = Object.entries(charUsage).sort((a, b) => b[1] - a[1])[0];
  const xp = userMsgCount * 10 + conversations.length * 5;

  const APP_TABS: { id: AppTab; label: string; icon: string }[] = [
    { id: "genel", label: "General", icon: "bar-chart-2" },
    { id: "ai", label: "AI & System", icon: "cpu" },
    { id: "engagement", label: "Notifications", icon: "bell" },
  ];

  const USER_TABS: { id: UserTab; label: string; icon: string }[] = [
    { id: "profil", label: "Profile", icon: "user" },
    { id: "analitik", label: "Analytics", icon: "activity" },
    { id: "ekonomi", label: "Economy", icon: "dollar-sign" },
    { id: "hafiza", label: "Memory", icon: "database" },
  ];

  const currentTabs = section === "app" ? APP_TABS : USER_TABS;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={TEXT_PRI} />
        </Pressable>
        <Pressable onPress={() => { setSecretTaps(t => { const n = t + 1; if (n >= 5) { Alert.alert("Debug", `ID: ${user?.id}\nAdmin: ${user?.isAdmin}\nVIP: ${user?.isVip}`); return 0; } return n; }); }}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </Pressable>
        <View style={styles.adminBadge}>
          <Feather name="shield" size={11} color="#FF9500" />
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Top Section Toggle */}
      <View style={styles.sectionToggle}>
        <Pressable
          onPress={() => { setSection("app"); setSelectedUserId(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.sectionToggleBtn, section === "app" && styles.sectionToggleBtnActive]}
        >
          <Feather name="globe" size={14} color={section === "app" ? "#fff" : TEXT_SEC} />
          <Text style={[styles.sectionToggleBtnText, section === "app" && { color: "#fff" }]}>App</Text>
        </Pressable>
        <Pressable
          onPress={() => { setSection("user"); setSelectedUserId(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.sectionToggleBtn, section === "user" && styles.sectionToggleBtnActive]}
        >
          <Feather name="user" size={14} color={section === "user" ? "#fff" : TEXT_SEC} />
          <Text style={[styles.sectionToggleBtnText, section === "user" && { color: "#fff" }]}>Users</Text>
        </Pressable>
      </View>

      {/* Sub Tabs — hidden when showing user list */}
      {(section === "app" || selectedUserId !== null) && (
        <View style={styles.subTabs}>
          {currentTabs.map(t => {
            const isActive = section === "app" ? appTab === t.id : userTab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (section === "app") setAppTab(t.id as AppTab);
                  else setUserTab(t.id as UserTab);
                }}
                style={[styles.subTab, isActive && styles.subTabActive]}
              >
                <Feather name={t.icon as any} size={12} color={isActive ? ACCENT : TEXT_SEC} />
                <Text style={[styles.subTabLabel, isActive && styles.subTabLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {section === "user" && selectedUserId !== null && (
        <Pressable
          onPress={() => { setSelectedUserId(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={styles.userBackBtn}
        >
          <Feather name="chevron-left" size={14} color={ACCENT} />
          <Text style={styles.userBackBtnText}>User List</Text>
        </Pressable>
      )}

      {!loaded ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: botPad + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===================== APP SECTION ===================== */}

          {section === "app" && appTab === "genel" && (
            <>
              <SectionTitle title="App Statistics" icon="activity" />
              <StatGrid items={[
                { label: "Total Messages", value: String(totalMessages), color: "#007AFF", icon: "message-circle" },
                { label: "Active Chats", value: String(conversations.length), color: "#34C759", icon: "users" },
                { label: "Feedback", value: String(feedbackList.length), color: "#FF9500", icon: "message-square" },
                { label: "Characters", value: String(CHARACTERS.length), color: "#AF52DE", icon: "user-check" },
              ]} />

              <SectionTitle title="Character Usage" icon="users" color="#34C759" />
              <Card>
                {CHARACTERS.map(char => {
                  const count = charUsage[char.id] ?? 0;
                  const pct = userMsgCount > 0 ? count / userMsgCount : 0;
                  const conv = conversations.filter(c => c.characterId === char.id).length;
                  return (
                    <View key={char.id} style={styles.charRow}>
                      <View style={[styles.charDot, { backgroundColor: char.gradientColors[0] }]} />
                      <Text style={styles.charName}>{char.name}</Text>
                      <View style={styles.charBarBg}>
                        <View style={[styles.charBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: char.gradientColors[0] }]} />
                      </View>
                      <Text style={styles.charCount}>{count}m</Text>
                      <Text style={[styles.charCount, { color: TEXT_TER, width: 28 }]}>{conv}s</Text>
                    </View>
                  );
                })}
                <View style={[styles.infoRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                  <Text style={[styles.infoLabel, { fontSize: 11 }]}>m = messages · c = chats</Text>
                  <Text style={styles.infoValue}>{topChar ? `Most popular: ${CHARACTERS.find(c => c.id === topChar[0])?.name}` : "—"}</Text>
                </View>
              </Card>

              <SectionTitle title="Summary" icon="info" color="#FF9500" />
              <Card>
                <InfoRow label="Total AI Replies" value={String(totalMessages - userMsgCount)} />
                <InfoRow label="Avg. Messages/Chat" value={conversations.length > 0 ? String(Math.round(totalMessages / conversations.length)) : "0"} />
                <InfoRow label="Active Characters" value={String(Object.keys(charUsage).length)} />
                <InfoRow label="Feedback Count" value={String(feedbackList.length)} />
                <InfoRow label="Bug Reports" value={String(feedbackList.filter(f => f.category === "bug").length)} />
                <InfoRow label="Suggestions" value={String(feedbackList.filter(f => f.category === "suggestion").length)} last />
              </Card>

              <SectionTitle title="User Registrations" icon="users" color="#007AFF" />
              {analyticsData ? (
                <>
                  <StatGrid items={[
                    { label: "Total Users", value: String(analyticsData.totals.total), color: "#007AFF", icon: "users" },
                    { label: "VIP Users", value: String(analyticsData.totals.vip), color: "#FFD700", icon: "star" },
                    { label: "Today", value: String(analyticsData.totals.today), color: "#34C759", icon: "calendar" },
                    { label: "This Month", value: String(analyticsData.totals.thisMonth), color: "#AF52DE", icon: "trending-up" },
                  ]} />
                  <RegistrationChart data={analyticsData} />
                </>
              ) : (
                <Card>
                  <View style={{ alignItems: "center", padding: 20 }}>
                    <ActivityIndicator color={ACCENT} />
                  </View>
                </Card>
              )}
            </>
          )}

          {section === "app" && appTab === "ai" && (
            <>
              <SectionTitle title="Character Detail Stats" icon="users" color="#007AFF" />
              <Card>
                {CHARACTERS.map((char, idx) => {
                  const count = charUsage[char.id] ?? 0;
                  const conv = conversations.filter(c => c.characterId === char.id);
                  const streak = streaks?.[char.id]?.currentStreak ?? 0;
                  const memories: string[] = charSettings[char.id]?.memories ?? [];
                  return (
                    <View key={char.id} style={[styles.charStatRow, idx === CHARACTERS.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={[styles.charDot, { backgroundColor: char.gradientColors[0], width: 10, height: 10, borderRadius: 5 }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.charStatName}>{char.name}</Text>
                        <Text style={styles.charStatSub}>{conv.length} chats · {count} msgs · {streak} day streak · {memories.length} memories</Text>
                      </View>
                      <Pressable onPress={() => clearMemory(char.id)} style={styles.trashBtn} hitSlop={8}>
                        <Feather name="trash-2" size={14} color="#FF3B30" />
                      </Pressable>
                    </View>
                  );
                })}
              </Card>

              <SectionTitle title="Global System Prompt" icon="settings" color="#FF9500" />
              <Card>
                <Text style={[styles.subNote, { marginBottom: 10 }]}>
                  Global rule added to all AI characters. Updates in real-time without restarting the app.
                </Text>
                <TextInput
                  style={styles.promptInput}
                  value={globalPrompt}
                  onChangeText={setGlobalPrompt}
                  placeholder="Write global rule... (leave empty to disable)"
                  placeholderTextColor={TEXT_TER}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
                <View style={styles.promptBtns}>
                  <Pressable onPress={resetGlobalPrompt} style={[styles.promptBtn, { backgroundColor: "#FF3B3015" }]}>
                    <Feather name="trash-2" size={14} color="#FF3B30" />
                    <Text style={[styles.promptBtnText, { color: "#FF3B30" }]}>Reset</Text>
                  </Pressable>
                  <Pressable onPress={saveGlobalPrompt} style={[styles.promptBtn, { flex: 1, backgroundColor: promptSaved ? "#34C75920" : ACCENT + "25" }]}>
                    {promptLoading
                      ? <ActivityIndicator size="small" color={ACCENT} />
                      : <Feather name={promptSaved ? "check" : "save"} size={14} color={promptSaved ? "#34C759" : ACCENT} />}
                    <Text style={[styles.promptBtnText, { color: promptSaved ? "#34C759" : ACCENT }]}>
                      {promptSaved ? "Saved!" : "Save & Apply"}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </>
          )}

          {section === "app" && appTab === "engagement" && (
            <>
              <SectionTitle title="Send Push Notification" icon="bell" color="#FF9500" />
              <Card>
                <Text style={[styles.subNote, { marginBottom: 10 }]}>Send a local notification to this device:</Text>
                <TextInput
                  style={styles.notifInput}
                  value={notifTitle}
                  onChangeText={setNotifTitle}
                  placeholder="Title..."
                  placeholderTextColor={TEXT_TER}
                  maxLength={50}
                />
                <TextInput
                  style={[styles.notifInput, { marginTop: 8, minHeight: 80, textAlignVertical: "top" }]}
                  value={notifBody}
                  onChangeText={setNotifBody}
                  placeholder="Message body..."
                  placeholderTextColor={TEXT_TER}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
                <View style={styles.quickMsgs}>
                  {["Miss you! 💭", "How was your day? ✨", "You have a surprise! 🎁", "I want to talk to you 💬"].map(msg => (
                    <Pressable key={msg} onPress={() => setNotifBody(msg)} style={styles.quickMsgBtn}>
                      <Text style={styles.quickMsgText}>{msg}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={sendNotif} style={[styles.actionBtn, { backgroundColor: "#FF950020", marginTop: 8 }]}>
                  <Feather name="send" size={15} color="#FF9500" />
                  <Text style={[styles.actionBtnText, { color: "#FF9500" }]}>Send Notification</Text>
                </Pressable>
              </Card>

              <SectionTitle title="Weekly Mission Management" icon="target" color="#AF52DE" />
              <Card>
                <Text style={[styles.subNote, { marginBottom: 10 }]}>
                  Missions are set automatically by week. To reset the current week's progress:
                </Text>
                <Pressable
                  onPress={() => {
                    Alert.alert("Reset Missions", "Reset all mission progress for this week?", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Reset", style: "destructive", onPress: async () => {
                          await AsyncStorage.removeItem(MISSIONS_KEY);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert("Done", "Missions will reset on next login.");
                        }
                      }
                    ]);
                  }}
                  style={[styles.actionBtn, { backgroundColor: "#AF52DE15" }]}
                >
                  <Feather name="refresh-cw" size={15} color="#AF52DE" />
                  <Text style={[styles.actionBtnText, { color: "#AF52DE" }]}>Reset Mission Progress</Text>
                </Pressable>
              </Card>

              <SectionTitle title="Feedback" icon="message-square" color="#34C759" />
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <View style={styles.fbTopBar}>
                  <Text style={styles.fbCount}>{feedbackList.length} feedback items</Text>
                  {feedbackList.length > 0 && (
                    <Pressable onPress={clearFeedback} style={styles.clearBtn}>
                      <Feather name="trash-2" size={13} color="#FF3B30" />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#FF3B30" }}>Clear</Text>
                    </Pressable>
                  )}
                </View>
                {feedbackList.length === 0 ? (
                  <View style={{ padding: 28, alignItems: "center", gap: 8 }}>
                    <Feather name="inbox" size={28} color={TEXT_TER} />
                    <Text style={styles.subNote}>No feedback yet</Text>
                  </View>
                ) : (
                  feedbackList.map((item, idx) => (
                    <View key={item.id} style={[styles.fbCard, idx === feedbackList.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={styles.fbCardTop}>
                        <View style={[styles.badge, { backgroundColor: (CAT_COLORS[item.category] ?? "#888") + "20" }]}>
                          <Text style={[styles.badgeText, { color: CAT_COLORS[item.category] ?? "#888" }]}>
                            {CAT_LABELS[item.category] ?? item.category}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(i => <Feather key={i} name="star" size={10} color={i <= item.rating ? "#FFD700" : TEXT_TER} />)}
                        </View>
                        <Text style={styles.fbDate}>{fmtDate(item.timestamp)}</Text>
                      </View>
                      <Text style={styles.fbText}>{item.text}</Text>
                    </View>
                  ))
                )}
              </Card>
            </>
          )}

          {/* ===================== USER SECTION ===================== */}

          {/* USER LIST */}
          {section === "user" && selectedUserId === null && (
            <>
              <SectionTitle title={`Registered Users (${usersList.length})`} icon="users" />
              <View style={styles.searchRow}>
                <Feather name="search" size={15} color={TEXT_TER} />
                <TextInput
                  style={styles.searchInput}
                  value={userSearch}
                  onChangeText={setUserSearch}
                  placeholder="Search by name or ID..."
                  placeholderTextColor={TEXT_TER}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                />
                {userSearch.length > 0 && (
                  <Pressable onPress={() => setUserSearch("")} hitSlop={8}>
                    <Feather name="x" size={14} color={TEXT_TER} />
                  </Pressable>
                )}
              </View>
              {(() => {
                const filtered = userSearch.trim().length === 0
                  ? usersList
                  : usersList.filter(u =>
                      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.user_id?.includes(userSearch) ||
                      u.id?.includes(userSearch) ||
                      u.email?.toLowerCase().includes(userSearch.toLowerCase())
                    );
                if (filtered.length === 0) {
                  return (
                    <Card>
                      <View style={{ alignItems: "center", padding: 20, gap: 8 }}>
                        <Feather name="users" size={28} color={TEXT_TER} />
                        <Text style={styles.subNote}>{usersList.length === 0 ? "No registered users yet" : "No results found"}</Text>
                      </View>
                    </Card>
                  );
                }
                return filtered.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => {
                      setSelectedUserId(u.id);
                      setUserTab("profil");
                      setUserEvents([]);
                      loadUserEvents(u.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={({ pressed }) => [styles.userListCard, pressed && { opacity: 0.75 }]}
                  >
                    <View style={styles.userListAvatar}>
                      <Text style={styles.userListAvatarText}>{(u.name?.[0] ?? "?").toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.userListName}>{u.name}</Text>
                        {u.is_vip && <View style={[styles.badge, { backgroundColor: "#FFD70025" }]}><Text style={[styles.badgeText, { color: "#FFD700" }]}>VIP</Text></View>}
                        {u.is_admin && <View style={[styles.badge, { backgroundColor: "#FF950025" }]}><Text style={[styles.badgeText, { color: "#FF9500" }]}>ADMIN</Text></View>}
                        {u.id === user?.id && <View style={[styles.badge, { backgroundColor: ACCENT + "25" }]}><Text style={[styles.badgeText, { color: ACCENT }]}>You</Text></View>}
                        <View style={[styles.badge, { backgroundColor: "#34C75925" }]}><Text style={[styles.badgeText, { color: "#34C759" }]}>Lv{u.level ?? 1}</Text></View>
                      </View>
                      <Text style={[styles.subNote, { fontSize: 11 }]}>@{u.username} · {u.platform ?? "?"} · {u.ip_address ?? "No IP"}</Text>
                      {u.last_seen && (
                        <Text style={[styles.subNote, { fontSize: 10 }]}>Last seen: {new Date(u.last_seen).toLocaleString("en-US")}</Text>
                      )}
                    </View>
                    <Feather name="chevron-right" size={16} color={TEXT_TER} />
                  </Pressable>
                ));
              })()}
            </>
          )}

          {/* USER MANAGEMENT (after selecting a user) */}
          {section === "user" && selectedUserId !== null && userTab === "profil" && (
            <>
              <SectionTitle title="Identity & Profile" icon="user" />
              <Card>
                <InfoRow label="Name" value={selectedUser?.name ?? "—"} />
                <InfoRow label="Username" value={`@${selectedUser?.username ?? "—"}`} />
                <InfoRow label="Email" value={selectedUser?.email ?? "—"} />
                <InfoRow label="User ID" value={selectedUser?.user_id ?? "—"} />
                <InfoRow label="DB ID" value={selectedUser?.id ?? "—"} mono />
                <InfoRow label="Language" value={selectedUser?.language ?? "—"} />
                <InfoRow label="Gender" value={selectedUser?.gender ?? "—"} />
                <InfoRow label="Birthdate" value={selectedUser?.birthdate ?? "—"} />
                <InfoRow label="Onboarding" value={selectedUser?.onboarding_complete ? "Completed" : "Incomplete"} last />
              </Card>

              <SectionTitle title="Device & Connection" icon="monitor" color="#34C759" />
              <Card>
                <InfoRow label="Platform" value={selectedUser?.platform ?? "—"} />
                <InfoRow label="IP Address" value={selectedUser?.ip_address ?? "—"} mono />
                <InfoRow label="City" value={selectedUser?.city ?? "—"} />
                <InfoRow label="Country" value={selectedUser?.country ?? "—"} />
                <InfoRow label="Browser / Device" value={selectedUser?.user_agent ? selectedUser.user_agent.substring(0, 60) + "..." : "—"} last />
              </Card>

              <SectionTitle title="Time Info" icon="clock" color="#FF9500" />
              <Card>
                <InfoRow label="Registration Date" value={selectedUser?.created_at ? new Date(selectedUser.created_at).toLocaleString("en-US") : "—"} />
                <InfoRow label="Last Seen" value={selectedUser?.last_seen ? new Date(selectedUser.last_seen).toLocaleString("en-US") : "—"} last />
              </Card>

              <SectionTitle title="VIP & Access" icon="star" color="#FFD700" />
              <Card>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.toggleLabel}>VIP Status</Text>
                    <Text style={styles.subNote}>{selectedUser?.is_vip ? "Unlimited messages · All features active" : "15 messages/day limit"}</Text>
                  </View>
                  <Switch
                    value={!!selectedUser?.is_vip}
                    onValueChange={toggleSelectedUserVip}
                    trackColor={{ false: "rgba(255,255,255,0.15)", true: "#FFD700" }}
                    thumbColor="#fff"
                  />
                </View>
                <Divider />
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.toggleLabel}>Admin Access</Text>
                    <Text style={styles.subNote}>{selectedUser?.is_admin ? "Admin rights active" : "Regular user"}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: selectedUser?.is_admin ? "#FF950020" : "rgba(255,255,255,0.05)" }]}>
                    <Text style={[styles.badgeText, { color: selectedUser?.is_admin ? "#FF9500" : TEXT_TER }]}>
                      {selectedUser?.is_admin ? "ACTIVE" : "OFF"}
                    </Text>
                  </View>
                </View>
              </Card>

              <SectionTitle title="Level & XP" icon="trending-up" color="#34C759" />
              <Card>
                <View style={{ gap: 14 }}>
                  <StatGrid items={[
                    { label: "Current Level", value: String(selectedUser?.level ?? 1), color: "#34C759", icon: "award" },
                    { label: "Total XP", value: String(selectedUser?.total_xp ?? 0), color: "#007AFF", icon: "zap" },
                  ]} />
                  <Divider />
                  <View style={{ gap: 10 }}>
                    <View style={styles.adminInputRow}>
                      <Text style={styles.adminInputLabel}>Level (1–100)</Text>
                      <TextInput
                        style={styles.adminInput}
                        value={levelInput}
                        onChangeText={setLevelInput}
                        keyboardType="number-pad"
                        maxLength={3}
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        placeholder="1"
                      />
                    </View>
                    <View style={styles.adminInputRow}>
                      <Text style={styles.adminInputLabel}>XP Points</Text>
                      <TextInput
                        style={styles.adminInput}
                        value={xpInput}
                        onChangeText={setXpInput}
                        keyboardType="number-pad"
                        maxLength={8}
                        placeholderTextColor="rgba(255,255,255,0.25)"
                        placeholder="0"
                      />
                    </View>
                    <Pressable
                      onPress={saveUserLevel}
                      disabled={levelSaving}
                      style={({ pressed }) => [styles.actionBtn, { backgroundColor: "#34C75922", opacity: levelSaving ? 0.5 : pressed ? 0.8 : 1 }]}
                    >
                      <Feather name="save" size={15} color="#34C759" />
                      <Text style={[styles.actionBtnText, { color: "#34C759" }]}>
                        {levelSaving ? "Saving..." : "Save Level & XP"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            </>
          )}

          {section === "user" && selectedUserId !== null && userTab === "analitik" && (
            <>
              <SectionTitle title="Session History" icon="activity" color="#007AFF" />
              {eventsLoading ? (
                <View style={{ alignItems: "center", padding: 24 }}>
                  <ActivityIndicator color={ACCENT} />
                </View>
              ) : userEvents.length === 0 ? (
                <Card>
                  <View style={{ alignItems: "center", padding: 20, gap: 8 }}>
                    <Feather name="activity" size={28} color={TEXT_TER} />
                    <Text style={styles.subNote}>No activity recorded yet</Text>
                  </View>
                </Card>
              ) : (
                <>
                  <StatGrid items={[
                    { label: "Total Events", value: String(userEvents.length), color: "#007AFF", icon: "activity" },
                    { label: "Unique Screens", value: String(new Set(userEvents.map(e => e.screen).filter(Boolean)).size), color: "#34C759", icon: "layers" },
                    { label: "Last Platform", value: userEvents[0]?.platform ?? "—", color: "#FF9500", icon: "monitor" },
                    { label: "Last IP", value: userEvents[0]?.ip_address ?? "—", color: "#AF52DE", icon: "globe" },
                  ]} />
                  <Card style={{ padding: 0, overflow: "hidden" }}>
                    {userEvents.map((ev, idx) => (
                      <View key={ev.id} style={[styles.eventRow, idx === userEvents.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={[styles.eventDot, { backgroundColor: ev.event_type === "login" ? "#34C759" : ev.event_type === "screen_view" ? "#007AFF" : ACCENT }]} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.eventType}>{ev.event_type}</Text>
                            {ev.screen && <Text style={styles.eventScreen}>{ev.screen}</Text>}
                          </View>
                          <Text style={styles.eventMeta}>{ev.platform ?? "?"} · {ev.ip_address ?? "No IP"}</Text>
                        </View>
                        <Text style={styles.eventTime}>{new Date(ev.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</Text>
                      </View>
                    ))}
                  </Card>
                  <Pressable
                    onPress={() => loadUserEvents(selectedUserId!)}
                    style={[styles.actionBtn, { backgroundColor: ACCENT + "20", marginTop: 0 }]}
                  >
                    <Feather name="refresh-cw" size={15} color={ACCENT} />
                    <Text style={[styles.actionBtnText, { color: ACCENT }]}>Refresh</Text>
                  </Pressable>
                </>
              )}
            </>
          )}

          {section === "user" && selectedUserId !== null && userTab === "ekonomi" && (
            <>
              <SectionTitle title="Coin Management" icon="dollar-sign" color="#FFD700" />
              <Card>
                <View style={styles.coinDisplay}>
                  <Feather name="dollar-sign" size={28} color="#FFD700" />
                  <Text style={styles.coinAmount}>{coins}</Text>
                  <Text style={styles.coinLabel}>Coins</Text>
                </View>
                <Divider />
                <Text style={[styles.subNote, { marginBottom: 8 }]}>Add coins manually:</Text>
                <View style={styles.coinRow}>
                  <TextInput
                    style={styles.coinInput}
                    value={coinInput}
                    onChangeText={setCoinInput}
                    placeholder="Amount..."
                    placeholderTextColor={TEXT_TER}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                  <Pressable onPress={addCoinsAdmin} style={styles.coinAddBtn}>
                    <Feather name="plus" size={15} color="#fff" />
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Add</Text>
                  </Pressable>
                </View>
                <View style={styles.quickCoins}>
                  {[100, 500, 1000, 5000].map(amt => (
                    <Pressable key={amt} onPress={() => setCoinInput(String(amt))} style={styles.quickCoinBtn}>
                      <Text style={styles.quickCoinText}>+{amt}</Text>
                    </Pressable>
                  ))}
                </View>
              </Card>

              <SectionTitle title="Daily Message Quota" icon="activity" color="#FF9500" />
              <Card>
                <View style={styles.quotaBar}>
                  <View style={[styles.quotaFill, { width: `${Math.min(100, ((quota?.count ?? 0) / 15) * 100)}%` }]} />
                </View>
                <InfoRow label="Used Today" value={`${quota?.count ?? 0} messages`} />
                <InfoRow label="Bonus Messages" value={`+${quota?.bonusMessages ?? 0}`} />
                <InfoRow label="Remaining" value={`${Math.max(0, 15 + (quota?.bonusMessages ?? 0) - (quota?.count ?? 0))} messages`} />
                <InfoRow label="VIP Status" value={user?.isVip ? "Unlimited" : "15/day"} last />
                <Divider />
                <Pressable onPress={resetQuota} style={[styles.actionBtn, { backgroundColor: "#FF950015" }]}>
                  <Feather name="refresh-cw" size={15} color="#FF9500" />
                  <Text style={[styles.actionBtnText, { color: "#FF9500" }]}>Reset Quota</Text>
                </Pressable>
              </Card>

              <SectionTitle title="Gift Inventory" icon="gift" color="#34C759" />
              <Card>
                {inventory.length === 0 ? (
                  <View style={{ padding: 16, alignItems: "center", gap: 8 }}>
                    <Feather name="inbox" size={24} color={TEXT_TER} />
                    <Text style={styles.subNote}>Inventory empty</Text>
                  </View>
                ) : (
                  inventory.map((item, idx) => {
                    const gift = GIFTS.find(g => g.id === item.giftId);
                    return (
                      <View key={item.giftId} style={[styles.invRow, idx === inventory.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={[styles.invIcon, { backgroundColor: (gift?.colorFrom ?? "#888") + "30" }]}>
                          <Feather name={(gift?.icon ?? "gift") as any} size={14} color={gift?.colorFrom ?? "#888"} />
                        </View>
                        <Text style={styles.invName}>{gift?.name ?? item.giftId}</Text>
                        <Text style={styles.subNote}>{item.quantity} items</Text>
                      </View>
                    );
                  })
                )}
              </Card>

              <SectionTitle title="Subscription Info" icon="credit-card" color="#007AFF" />
              <Card>
                <InfoRow label="Current Plan" value={selectedUser?.is_vip ? "VIP Premium" : "Free"} />
                <InfoRow label="Store" value="Apple App Store" />
                <InfoRow label="Expiry Date" value={selectedUser?.is_vip ? "Unlimited (Manual)" : "—"} last />
              </Card>
            </>
          )}

          {section === "user" && selectedUserId !== null && userTab === "hafiza" && (
            <>
              <SectionTitle title="Character AI Memories" icon="database" color="#AF52DE" />
              <Text style={[styles.subNote, { marginHorizontal: 0, marginBottom: 8 }]}>
                What each character remembers about this user. You can delete incorrect information.
              </Text>
              {CHARACTERS.map(char => {
                const memories: string[] = charSettings[char.id]?.memories ?? [];
                return (
                  <Card key={char.id}>
                    <View style={styles.memHeader}>
                      <View style={[styles.charDot, { backgroundColor: char.gradientColors[0], width: 10, height: 10, borderRadius: 5 }]} />
                      <Text style={styles.memCharName}>{char.name}</Text>
                      <Text style={styles.subNote}>{memories.length} memories</Text>
                      <Pressable onPress={() => clearMemory(char.id)} hitSlop={8} style={{ marginLeft: 8 }}>
                        <Feather name="trash-2" size={14} color={memories.length > 0 ? "#FF3B30" : TEXT_TER} />
                      </Pressable>
                    </View>
                    {memories.length === 0 ? (
                      <Text style={[styles.subNote, { fontStyle: "italic" }]}>No memories yet</Text>
                    ) : (
                      memories.map((mem, idx) => (
                        <View key={idx} style={[styles.memRow, idx === memories.length - 1 && { borderBottomWidth: 0 }]}>
                          <View style={styles.memDot} />
                          <Text style={styles.memText}>{mem}</Text>
                        </View>
                      ))
                    )}
                  </Card>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: TEXT_PRI },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,149,0,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  adminBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#FF9500", letterSpacing: 0.8 },
  backCenterBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: ACCENT + "20", borderRadius: 14 },
  sectionToggle: { flexDirection: "row", margin: 12, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 4, gap: 4 },
  sectionToggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, borderRadius: 11 },
  sectionToggleBtnActive: { backgroundColor: ACCENT },
  sectionToggleBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT_SEC },
  subTabs: { flexDirection: "row", paddingHorizontal: 12, gap: 8, marginBottom: 4 },
  subTab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)" },
  subTabActive: { backgroundColor: ACCENT + "20", borderWidth: 1, borderColor: ACCENT + "40" },
  subTabLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: TEXT_SEC },
  subTabLabelActive: { color: ACCENT, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 12, paddingTop: 12, gap: 12 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 2 },
  sectionIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  sectionTitleText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT_SEC, letterSpacing: 0.5, textTransform: "uppercase" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCell: { width: "47%", flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statVal: { fontSize: 22, fontFamily: "Inter_700Bold", color: TEXT_PRI, letterSpacing: -0.5 },
  statLbl: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT_SEC, textAlign: "center" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_SEC },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_PRI, maxWidth: "60%", textAlign: "right" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 12 },
  charRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  charDot: { width: 8, height: 8, borderRadius: 4 },
  charName: { fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT_PRI, width: 46 },
  charBarBg: { flex: 1, height: 5, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" },
  charBarFill: { height: 5, borderRadius: 3, minWidth: 3 },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT_SEC, width: 32, textAlign: "right" },
  charStatRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  charStatName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT_PRI },
  charStatSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT_SEC, marginTop: 2 },
  trashBtn: { padding: 6 },
  subNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT_SEC, lineHeight: 17 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT_PRI },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  badge: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT_SEC },
  coinDisplay: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 8 },
  coinAmount: { fontSize: 40, fontFamily: "Inter_700Bold", color: "#FFD700", letterSpacing: -1 },
  coinLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT_SEC, alignSelf: "flex-end", marginBottom: 6 },
  coinRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  coinInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT_PRI, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  adminInputRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  adminInputLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_SEC },
  adminInput: { width: 100, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEXT_PRI, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, textAlign: "center" },
  coinAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  quickCoins: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  quickCoinBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  quickCoinText: { fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT_SEC },
  quotaBar: { height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 12 },
  quotaFill: { height: 6, backgroundColor: "#FF9500", borderRadius: 3 },
  invRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  invIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  invName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_PRI },
  memHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  memCharName: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT_PRI },
  memRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  memDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: ACCENT, marginTop: 5 },
  memText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT_SEC, lineHeight: 18 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_PRI, paddingVertical: 2 },
  userListCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: CARD, borderRadius: 16, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  userListAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT + "30", justifyContent: "center", alignItems: "center" },
  userListAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold", color: ACCENT },
  userListName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT_PRI },
  userBackBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 12, marginBottom: 4, alignSelf: "flex-start" },
  userBackBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: ACCENT },
  promptInput: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, padding: 12, fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_PRI, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, minHeight: 100, marginBottom: 10 },
  promptBtns: { flexDirection: "row", gap: 10 },
  promptBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, paddingHorizontal: 16 },
  promptBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  notifInput: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_PRI, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  quickMsgs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  quickMsgBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  quickMsgText: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT_SEC },
  fbTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  fbCount: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_SEC },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: "rgba(255,59,48,0.1)" },
  fbCard: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER, gap: 6 },
  fbCardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  fbDate: { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT_TER, marginLeft: "auto" },
  fbText: { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_PRI, lineHeight: 19 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  eventDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  eventType: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: TEXT_PRI },
  eventScreen: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT_SEC, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  eventMeta: { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT_TER },
  eventTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT_TER, flexShrink: 0 },
});
