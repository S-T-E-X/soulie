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
type UserTab = "profil" | "ekonomi" | "hafiza";

type FeedbackEntry = {
  id: string;
  category: string;
  rating: number;
  text: string;
  timestamp: number;
};

const CAT_LABELS: Record<string, string> = { bug: "Hata", suggestion: "Öneri", praise: "Beğeni", other: "Diğer" };
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
  const [usersList, setUsersList] = useState<User[]>([]);

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

  const selectedUser = usersList.find(u => u.id === selectedUserId) ?? user;

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadAll();
  }, [user?.isAdmin]);

  const loadAll = async () => {
    try {
      const [fb, inv, q, cs, sk, usersRaw] = await Promise.all([
        AsyncStorage.getItem(FEEDBACK_KEY),
        AsyncStorage.getItem(INVENTORY_KEY),
        AsyncStorage.getItem(QUOTA_KEY),
        AsyncStorage.getItem(CHAR_SETTINGS_KEY),
        AsyncStorage.getItem(STREAKS_KEY),
        AsyncStorage.getItem("soulie_users_db_v1"),
      ]);
      if (fb) setFeedbackList(JSON.parse(fb));
      if (inv) setInventory(JSON.parse(inv));
      if (q) setQuota(JSON.parse(q));
      if (cs) setCharSettings(JSON.parse(cs));
      if (sk) setStreaks(JSON.parse(sk));
      if (usersRaw) {
        setUsersList(JSON.parse(usersRaw));
      } else if (user) {
        setUsersList([user]);
      }
    } catch {}
    setLoaded(true);
    fetchGlobalPrompt();
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
      Alert.alert("Hata", "Kaydedilemedi.");
    } finally {
      setPromptLoading(false);
    }
  };

  const resetGlobalPrompt = () => {
    Alert.alert("Sıfırla", "Global sistem promptunu sıfırlamak istiyor musun?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sıfırla", style: "destructive", onPress: async () => {
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
    const newVip = !target.isVip;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = { ...target, isVip: newVip, vipExpiry: newVip ? undefined : undefined };
    const newList = usersList.map(u => u.id === selectedUserId ? updated : u);
    setUsersList(newList);
    await AsyncStorage.setItem("soulie_users_db_v1", JSON.stringify(newList));
    if (selectedUserId === user?.id) {
      await updateProfile({ isVip: newVip });
    }
  };

  const addCoinsAdmin = async () => {
    const amount = parseInt(coinInput, 10);
    if (isNaN(amount) || amount <= 0) { Alert.alert("Geçersiz miktar"); return; }
    await addCoinsCtx(amount);
    setCoinInput("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resetQuota = () => {
    Alert.alert("Kotayı Sıfırla", "Bugünkü mesaj kotasını sıfırlamak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sıfırla", onPress: async () => {
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
    Alert.alert("Hafızayı Sil", `${charName} için AI hafızasını silmek istediğine emin misin?`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive", onPress: async () => {
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
    if (!notifTitle.trim() || !notifBody.trim()) { Alert.alert("Başlık ve mesaj gerekli"); return; }
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") { Alert.alert("İzin Gerekli", "Bildirim göndermek için izin verilmedi."); return; }
      await Notifications.scheduleNotificationAsync({
        content: { title: notifTitle, body: notifBody, sound: true },
        trigger: null,
      });
      setNotifTitle(""); setNotifBody("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Gönderildi", "Bildirim başarıyla gönderildi.");
    } catch { Alert.alert("Hata", "Bildirim gönderilemedi."); }
  };

  const clearFeedback = () => {
    Alert.alert("Sil", "Tüm geri bildirimleri silmek istiyor musun?", [
      { text: "İptal", style: "cancel" },
      { text: "Sil", style: "destructive", onPress: async () => { await AsyncStorage.removeItem(FEEDBACK_KEY); setFeedbackList([]); } }
    ]);
  };

  if (!user?.isAdmin) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Feather name="lock" size={40} color={TEXT_TER} />
        <Text style={[styles.sectionTitleText, { marginTop: 12, color: TEXT_SEC, textTransform: "none", fontSize: 16 }]}>Erişim Reddedildi</Text>
        <Pressable onPress={() => router.back()} style={styles.backCenterBtn}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: ACCENT }}>Geri Dön</Text>
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
    { id: "genel", label: "Genel", icon: "bar-chart-2" },
    { id: "ai", label: "AI & Sistem", icon: "cpu" },
    { id: "engagement", label: "Bildirim & Görev", icon: "bell" },
  ];

  const USER_TABS: { id: UserTab; label: string; icon: string }[] = [
    { id: "profil", label: "Profil", icon: "user" },
    { id: "ekonomi", label: "Ekonomi", icon: "dollar-sign" },
    { id: "hafiza", label: "Hafıza", icon: "database" },
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
          <Text style={styles.headerTitle}>Admin Paneli</Text>
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
          <Text style={[styles.sectionToggleBtnText, section === "app" && { color: "#fff" }]}>Uygulama</Text>
        </Pressable>
        <Pressable
          onPress={() => { setSection("user"); setSelectedUserId(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.sectionToggleBtn, section === "user" && styles.sectionToggleBtnActive]}
        >
          <Feather name="user" size={14} color={section === "user" ? "#fff" : TEXT_SEC} />
          <Text style={[styles.sectionToggleBtnText, section === "user" && { color: "#fff" }]}>Kullanıcı</Text>
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
          <Text style={styles.userBackBtnText}>Kullanıcı Listesi</Text>
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
              <SectionTitle title="Uygulama İstatistikleri" icon="activity" />
              <StatGrid items={[
                { label: "Toplam Mesaj", value: String(totalMessages), color: "#007AFF", icon: "message-circle" },
                { label: "Aktif Sohbet", value: String(conversations.length), color: "#34C759", icon: "users" },
                { label: "Geri Bildirim", value: String(feedbackList.length), color: "#FF9500", icon: "message-square" },
                { label: "Karakter Sayısı", value: String(CHARACTERS.length), color: "#AF52DE", icon: "user-check" },
              ]} />

              <SectionTitle title="Karakter Kullanım Analizi" icon="users" color="#34C759" />
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
                  <Text style={[styles.infoLabel, { fontSize: 11 }]}>m = mesaj · s = sohbet</Text>
                  <Text style={styles.infoValue}>{topChar ? `En popüler: ${CHARACTERS.find(c => c.id === topChar[0])?.name}` : "—"}</Text>
                </View>
              </Card>

              <SectionTitle title="Özet" icon="info" color="#FF9500" />
              <Card>
                <InfoRow label="Toplam AI Yanıtı" value={String(totalMessages - userMsgCount)} />
                <InfoRow label="Ort. Mesaj/Sohbet" value={conversations.length > 0 ? String(Math.round(totalMessages / conversations.length)) : "0"} />
                <InfoRow label="Aktif Karakter" value={String(Object.keys(charUsage).length)} />
                <InfoRow label="Feedback Sayısı" value={String(feedbackList.length)} />
                <InfoRow label="Hata Raporu" value={String(feedbackList.filter(f => f.category === "bug").length)} />
                <InfoRow label="Öneri Sayısı" value={String(feedbackList.filter(f => f.category === "suggestion").length)} last />
              </Card>
            </>
          )}

          {section === "app" && appTab === "ai" && (
            <>
              <SectionTitle title="Karakter Detay İstatistikleri" icon="users" color="#007AFF" />
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
                        <Text style={styles.charStatSub}>{conv.length} sohbet · {count} mesaj · {streak} gün seri · {memories.length} hafıza</Text>
                      </View>
                      <Pressable onPress={() => clearMemory(char.id)} style={styles.trashBtn} hitSlop={8}>
                        <Feather name="trash-2" size={14} color="#FF3B30" />
                      </Pressable>
                    </View>
                  );
                })}
              </Card>

              <SectionTitle title="Global Sistem Promptu" icon="settings" color="#FF9500" />
              <Card>
                <Text style={[styles.subNote, { marginBottom: 10 }]}>
                  Tüm AI karakterlerinin davranışına eklenen global kural. Uygulamayı kapatmadan anlık güncellenir.
                </Text>
                <TextInput
                  style={styles.promptInput}
                  value={globalPrompt}
                  onChangeText={setGlobalPrompt}
                  placeholder="Global kural yaz... (boş bırakırsan devre dışı)"
                  placeholderTextColor={TEXT_TER}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
                <View style={styles.promptBtns}>
                  <Pressable onPress={resetGlobalPrompt} style={[styles.promptBtn, { backgroundColor: "#FF3B3015" }]}>
                    <Feather name="trash-2" size={14} color="#FF3B30" />
                    <Text style={[styles.promptBtnText, { color: "#FF3B30" }]}>Sıfırla</Text>
                  </Pressable>
                  <Pressable onPress={saveGlobalPrompt} style={[styles.promptBtn, { flex: 1, backgroundColor: promptSaved ? "#34C75920" : ACCENT + "25" }]}>
                    {promptLoading
                      ? <ActivityIndicator size="small" color={ACCENT} />
                      : <Feather name={promptSaved ? "check" : "save"} size={14} color={promptSaved ? "#34C759" : ACCENT} />}
                    <Text style={[styles.promptBtnText, { color: promptSaved ? "#34C759" : ACCENT }]}>
                      {promptSaved ? "Kaydedildi!" : "Kaydet & Uygula"}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </>
          )}

          {section === "app" && appTab === "engagement" && (
            <>
              <SectionTitle title="Push Bildirim Gönder" icon="bell" color="#FF9500" />
              <Card>
                <Text style={[styles.subNote, { marginBottom: 10 }]}>Kullanıcıya anlık yerel bildirim gönder:</Text>
                <TextInput
                  style={styles.notifInput}
                  value={notifTitle}
                  onChangeText={setNotifTitle}
                  placeholder="Başlık..."
                  placeholderTextColor={TEXT_TER}
                  maxLength={50}
                />
                <TextInput
                  style={[styles.notifInput, { marginTop: 8, minHeight: 80, textAlignVertical: "top" }]}
                  value={notifBody}
                  onChangeText={setNotifBody}
                  placeholder="Mesaj içeriği..."
                  placeholderTextColor={TEXT_TER}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
                <View style={styles.quickMsgs}>
                  {["Seni özledim! 💭", "Bugün nasıl geçti? ✨", "Sürprizin var! 🎁", "Seninle konuşmak istiyorum 💬"].map(msg => (
                    <Pressable key={msg} onPress={() => setNotifBody(msg)} style={styles.quickMsgBtn}>
                      <Text style={styles.quickMsgText}>{msg}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={sendNotif} style={[styles.actionBtn, { backgroundColor: "#FF950020", marginTop: 8 }]}>
                  <Feather name="send" size={15} color="#FF9500" />
                  <Text style={[styles.actionBtnText, { color: "#FF9500" }]}>Bildirimi Gönder</Text>
                </Pressable>
              </Card>

              <SectionTitle title="Haftalık Görev Yönetimi" icon="target" color="#AF52DE" />
              <Card>
                <Text style={[styles.subNote, { marginBottom: 10 }]}>
                  Görevler haftaya göre otomatik belirlenir. Mevcut haftanın ilerlemesini sıfırlamak için:
                </Text>
                <Pressable
                  onPress={() => {
                    Alert.alert("Görevleri Sıfırla", "Bu haftanın tüm görev ilerlemesini sıfırlamak istediğine emin misin?", [
                      { text: "İptal", style: "cancel" },
                      {
                        text: "Sıfırla", style: "destructive", onPress: async () => {
                          await AsyncStorage.removeItem(MISSIONS_KEY);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert("Sıfırlandı", "Görevler bir sonraki girişte yenilenecek.");
                        }
                      }
                    ]);
                  }}
                  style={[styles.actionBtn, { backgroundColor: "#AF52DE15" }]}
                >
                  <Feather name="refresh-cw" size={15} color="#AF52DE" />
                  <Text style={[styles.actionBtnText, { color: "#AF52DE" }]}>Görev İlerlemesini Sıfırla</Text>
                </Pressable>
              </Card>

              <SectionTitle title="Geri Bildirimler" icon="message-square" color="#34C759" />
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <View style={styles.fbTopBar}>
                  <Text style={styles.fbCount}>{feedbackList.length} geri bildirim</Text>
                  {feedbackList.length > 0 && (
                    <Pressable onPress={clearFeedback} style={styles.clearBtn}>
                      <Feather name="trash-2" size={13} color="#FF3B30" />
                      <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: "#FF3B30" }}>Temizle</Text>
                    </Pressable>
                  )}
                </View>
                {feedbackList.length === 0 ? (
                  <View style={{ padding: 28, alignItems: "center", gap: 8 }}>
                    <Feather name="inbox" size={28} color={TEXT_TER} />
                    <Text style={styles.subNote}>Henüz geri bildirim yok</Text>
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
              <SectionTitle title={`Kayıtlı Kullanıcılar (${usersList.length})`} icon="users" />
              <View style={styles.searchRow}>
                <Feather name="search" size={15} color={TEXT_TER} />
                <TextInput
                  style={styles.searchInput}
                  value={userSearch}
                  onChangeText={setUserSearch}
                  placeholder="İsim veya ID ile ara..."
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
                      u.userId?.includes(userSearch) ||
                      u.id?.includes(userSearch)
                    );
                if (filtered.length === 0) {
                  return (
                    <Card>
                      <View style={{ alignItems: "center", padding: 20, gap: 8 }}>
                        <Feather name="users" size={28} color={TEXT_TER} />
                        <Text style={styles.subNote}>{usersList.length === 0 ? "Henüz kayıtlı kullanıcı yok" : "Arama sonucu bulunamadı"}</Text>
                      </View>
                    </Card>
                  );
                }
                return filtered.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => { setSelectedUserId(u.id); setUserTab("profil"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={({ pressed }) => [styles.userListCard, pressed && { opacity: 0.75 }]}
                  >
                    <View style={styles.userListAvatar}>
                      <Text style={styles.userListAvatarText}>{(u.name?.[0] ?? "?").toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.userListName}>{u.name}</Text>
                        {u.isVip && <View style={[styles.badge, { backgroundColor: "#FFD70025" }]}><Text style={[styles.badgeText, { color: "#FFD700" }]}>VIP</Text></View>}
                        {u.isAdmin && <View style={[styles.badge, { backgroundColor: "#FF950025" }]}><Text style={[styles.badgeText, { color: "#FF9500" }]}>ADMIN</Text></View>}
                        {u.id === user?.id && <View style={[styles.badge, { backgroundColor: ACCENT + "25" }]}><Text style={[styles.badgeText, { color: ACCENT }]}>Aktif</Text></View>}
                      </View>
                      <Text style={[styles.subNote, { fontSize: 11 }]}>@{u.username} · ID: {u.userId}</Text>
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
              <SectionTitle title="Kullanıcı Bilgileri" icon="user" />
              <Card>
                <InfoRow label="İsim" value={selectedUser?.name ?? "—"} />
                <InfoRow label="Kullanıcı Adı" value={`@${selectedUser?.username ?? "—"}`} />
                <InfoRow label="E-posta" value={selectedUser?.email ?? "—"} />
                <InfoRow label="Kullanıcı ID" value={selectedUser?.userId ?? "—"} />
                <InfoRow label="Dil" value={selectedUser?.language === "en" ? "English" : "Türkçe"} />
                <InfoRow label="Cinsiyet" value={selectedUser?.gender ?? "—"} />
                <InfoRow label="Doğum Tarihi" value={selectedUser?.birthdate ?? "—"} />
                <InfoRow label="Bio" value={selectedUser?.bio || "—"} />
                <InfoRow label="Hobiler" value={selectedUser?.hobbies?.join(", ") || "—"} last />
              </Card>

              <SectionTitle title="VIP & Erişim" icon="star" color="#FFD700" />
              <Card>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.toggleLabel}>VIP Durumu</Text>
                    <Text style={styles.subNote}>{selectedUser?.isVip ? "Sınırsız mesaj · Tüm özellikler aktif" : "Günlük 15 mesaj limiti"}</Text>
                  </View>
                  <Switch
                    value={!!selectedUser?.isVip}
                    onValueChange={toggleSelectedUserVip}
                    trackColor={{ false: "rgba(255,255,255,0.15)", true: "#FFD700" }}
                    thumbColor="#fff"
                  />
                </View>
                <Divider />
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.toggleLabel}>Admin Erişimi</Text>
                    <Text style={styles.subNote}>Yönetici hakları aktif</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: "#FF950020" }]}>
                    <Text style={[styles.badgeText, { color: "#FF9500" }]}>AKTİF</Text>
                  </View>
                </View>
                <Divider />
                <Pressable
                  onPress={() => Alert.alert("Ban / Askıya Al", "Gerçek bir multi-user backend bağlandığında burada kullanıcı hesabı askıya alınacak.", [{ text: "Tamam" }])}
                  style={[styles.actionBtn, { backgroundColor: "#FF3B3015" }]}
                >
                  <Feather name="slash" size={15} color="#FF3B30" />
                  <Text style={[styles.actionBtnText, { color: "#FF3B30" }]}>Ban / Askıya Al</Text>
                </Pressable>
              </Card>

              <SectionTitle title="Kullanım İstatistikleri" icon="trending-up" color="#007AFF" />
              <Card>
                <InfoRow label="Toplam Gönderilen Mesaj" value={String(userMsgCount)} />
                <InfoRow label="Toplam Sohbet" value={String(conversations.length)} />
                <InfoRow label="Toplam XP" value={String(userMsgCount * 10 + conversations.length * 5)} />
                <InfoRow label="En Çok Konuştuğu Karakter" value={topChar ? (CHARACTERS.find(c => c.id === topChar[0])?.name ?? topChar[0]) : "—"} />
                <InfoRow label="Son Aktif" value={conversations.length > 0 ? fmtDate(Math.max(...conversations.map(c => c.updatedAt))) : "—"} last />
              </Card>
            </>
          )}

          {section === "user" && selectedUserId !== null && userTab === "ekonomi" && (
            <>
              <SectionTitle title="Coin Yönetimi" icon="dollar-sign" color="#FFD700" />
              <Card>
                <View style={styles.coinDisplay}>
                  <Feather name="dollar-sign" size={28} color="#FFD700" />
                  <Text style={styles.coinAmount}>{coins}</Text>
                  <Text style={styles.coinLabel}>Coin</Text>
                </View>
                <Divider />
                <Text style={[styles.subNote, { marginBottom: 8 }]}>Manuel coin ekle:</Text>
                <View style={styles.coinRow}>
                  <TextInput
                    style={styles.coinInput}
                    value={coinInput}
                    onChangeText={setCoinInput}
                    placeholder="Miktar..."
                    placeholderTextColor={TEXT_TER}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                  <Pressable onPress={addCoinsAdmin} style={styles.coinAddBtn}>
                    <Feather name="plus" size={15} color="#fff" />
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" }}>Ekle</Text>
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

              <SectionTitle title="Günlük Mesaj Kotası" icon="activity" color="#FF9500" />
              <Card>
                <View style={styles.quotaBar}>
                  <View style={[styles.quotaFill, { width: `${Math.min(100, ((quota?.count ?? 0) / 15) * 100)}%` }]} />
                </View>
                <InfoRow label="Bugün Kullanılan" value={`${quota?.count ?? 0} mesaj`} />
                <InfoRow label="Bonus Mesajlar" value={`+${quota?.bonusMessages ?? 0}`} />
                <InfoRow label="Kalan Hak" value={`${Math.max(0, 15 + (quota?.bonusMessages ?? 0) - (quota?.count ?? 0))} mesaj`} />
                <InfoRow label="VIP Durumu" value={user?.isVip ? "Sınırsız" : "15/gün"} last />
                <Divider />
                <Pressable onPress={resetQuota} style={[styles.actionBtn, { backgroundColor: "#FF950015" }]}>
                  <Feather name="refresh-cw" size={15} color="#FF9500" />
                  <Text style={[styles.actionBtnText, { color: "#FF9500" }]}>Kotayı Sıfırla</Text>
                </Pressable>
              </Card>

              <SectionTitle title="Hediye Envanteri" icon="gift" color="#34C759" />
              <Card>
                {inventory.length === 0 ? (
                  <View style={{ padding: 16, alignItems: "center", gap: 8 }}>
                    <Feather name="inbox" size={24} color={TEXT_TER} />
                    <Text style={styles.subNote}>Envanter boş</Text>
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
                        <Text style={styles.subNote}>{item.quantity} adet</Text>
                      </View>
                    );
                  })
                )}
              </Card>

              <SectionTitle title="Abonelik Bilgisi" icon="credit-card" color="#007AFF" />
              <Card>
                <InfoRow label="Mevcut Plan" value={selectedUser?.isVip ? "VIP Premium" : "Ücretsiz"} />
                <InfoRow label="Mağaza" value="Apple App Store" />
                <InfoRow label="Bitiş Tarihi" value={selectedUser?.isVip ? "Süresiz (Manuel)" : "—"} last />
              </Card>
            </>
          )}

          {section === "user" && selectedUserId !== null && userTab === "hafiza" && (
            <>
              <SectionTitle title="Karakter AI Hafızaları" icon="database" color="#AF52DE" />
              <Text style={[styles.subNote, { marginHorizontal: 0, marginBottom: 8 }]}>
                Her karakterin bu kullanıcı hakkında hatırladıkları. Yanlış bilgileri silebilirsin.
              </Text>
              {CHARACTERS.map(char => {
                const memories: string[] = charSettings[char.id]?.memories ?? [];
                return (
                  <Card key={char.id}>
                    <View style={styles.memHeader}>
                      <View style={[styles.charDot, { backgroundColor: char.gradientColors[0], width: 10, height: 10, borderRadius: 5 }]} />
                      <Text style={styles.memCharName}>{char.name}</Text>
                      <Text style={styles.subNote}>{memories.length} hafıza</Text>
                      <Pressable onPress={() => clearMemory(char.id)} hitSlop={8} style={{ marginLeft: 8 }}>
                        <Feather name="trash-2" size={14} color={memories.length > 0 ? "#FF3B30" : TEXT_TER} />
                      </Pressable>
                    </View>
                    {memories.length === 0 ? (
                      <Text style={[styles.subNote, { fontStyle: "italic" }]}>Henüz hafıza yok</Text>
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
});
