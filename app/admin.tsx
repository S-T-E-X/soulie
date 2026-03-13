import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  FlatList,
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
import { useChatContext } from "@/contexts/ChatContext";
import { CHARACTERS } from "@/constants/characters";
import { GIFTS } from "@/contexts/GiftContext";
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

type AdminTab = "dashboard" | "user" | "economy" | "ai" | "tasks";

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

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && { fontFamily: "Inter_400Regular", fontSize: 11 }]} numberOfLines={1} ellipsizeMode="middle">{value}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { user, updateProfile, grantAdminAccess } = useAuth();
  const { conversations } = useChatContext();

  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [coins, setCoins] = useState(0);
  const [inventory, setInventory] = useState<{ giftId: string; quantity: number }[]>([]);
  const [quota, setQuota] = useState<{ count: number; bonusMessages: number } | null>(null);
  const [charSettings, setCharSettings] = useState<Record<string, any>>({});
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [coinInput, setCoinInput] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [secretTaps, setSecretTaps] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [streaks, setStreaks] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user?.isAdmin) return;
    loadAll();
  }, [user?.isAdmin]);

  const loadAll = async () => {
    try {
      const [fb, c, inv, q, cs, sk] = await Promise.all([
        AsyncStorage.getItem(FEEDBACK_KEY),
        AsyncStorage.getItem(COINS_KEY),
        AsyncStorage.getItem(INVENTORY_KEY),
        AsyncStorage.getItem(QUOTA_KEY),
        AsyncStorage.getItem(CHAR_SETTINGS_KEY),
        AsyncStorage.getItem(STREAKS_KEY),
      ]);
      if (fb) setFeedbackList(JSON.parse(fb));
      if (c) setCoins(JSON.parse(c).coins ?? 0);
      if (inv) setInventory(JSON.parse(inv));
      if (q) setQuota(JSON.parse(q));
      if (cs) setCharSettings(JSON.parse(cs));
      if (sk) setStreaks(JSON.parse(sk));
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
      Alert.alert("Hata", "Sistem promptu kaydedilemedi.");
    } finally {
      setPromptLoading(false);
    }
  };

  const resetGlobalPrompt = async () => {
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

  const toggleBan = () => {
    Alert.alert("Ban/Suspend", "Bu özellik gerçek bir backend gerektirir. Şu an yerel kullanıcı için simülasyon yapılıyor.", [{ text: "Tamam" }]);
  };

  const addCoinsAdmin = async () => {
    const amount = parseInt(coinInput, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Geçersiz miktar");
      return;
    }
    const newCoins = coins + amount;
    await AsyncStorage.setItem(COINS_KEY, JSON.stringify({ coins: newCoins }));
    setCoins(newCoins);
    setCoinInput("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Başarılı", `${amount} coin eklendi. Toplam: ${newCoins}`);
  };

  const resetQuota = async () => {
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

  const clearMemory = async (charId: string) => {
    Alert.alert("Hafızayı Sil", `${charId} için AI hafızasını silmek istediğine emin misin?`, [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive", onPress: async () => {
          const key = `soulie_memories_${charId}`;
          await AsyncStorage.removeItem(key);
          const updatedSettings = { ...charSettings };
          if (updatedSettings[charId]) {
            updatedSettings[charId] = { ...updatedSettings[charId], memories: [] };
          }
          await AsyncStorage.setItem(CHAR_SETTINGS_KEY, JSON.stringify(updatedSettings));
          setCharSettings(updatedSettings);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };

  const sendPushNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      Alert.alert("Başlık ve mesaj gerekli");
      return;
    }
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("İzin Gerekli", "Bildirim göndermek için izin verilmedi.");
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: notifTitle, body: notifBody, sound: true },
        trigger: null,
      });
      setNotifTitle("");
      setNotifBody("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Gönderildi", "Bildirim başarıyla gönderildi.");
    } catch {
      Alert.alert("Hata", "Bildirim gönderilemedi.");
    }
  };

  const clearFeedback = () => {
    Alert.alert("Geri Bildirimleri Sil", "Tümünü silmek istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive", onPress: async () => {
          await AsyncStorage.removeItem(FEEDBACK_KEY);
          setFeedbackList([]);
        }
      }
    ]);
  };

  const handleSecretTap = () => {
    const next = secretTaps + 1;
    setSecretTaps(next);
    if (next >= 5) {
      setSecretTaps(0);
      Alert.alert("Debug", `ID: ${user?.id}\nUsername: ${user?.username}\nAdmin: ${user?.isAdmin}\nVIP: ${user?.isVip}`);
    }
  };

  if (!user?.isAdmin) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <Feather name="lock" size={40} color={TEXT_TER} />
        <Text style={[styles.sectionTitleText, { marginTop: 12, color: TEXT_SEC }]}>Erişim Reddedildi</Text>
        <Pressable onPress={() => router.back()} style={styles.backCenterBtn}>
          <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: ACCENT }}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const totalMessages = conversations.reduce((a, c) => a + c.messages.length, 0);
  const userMessages = conversations.reduce((a, c) => a + c.messages.filter(m => m.role === "user").length, 0);
  const charUsage: Record<string, number> = {};
  conversations.forEach(c => { charUsage[c.characterId] = (charUsage[c.characterId] ?? 0) + c.messages.length; });
  const topChar = Object.entries(charUsage).sort((a, b) => b[1] - a[1])[0];
  const xp = userMessages * 10 + conversations.length * 5;
  const today = new Date().toISOString().split("T")[0];

  const TABS: { id: AdminTab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Genel", icon: "activity" },
    { id: "user", label: "Kullanıcı", icon: "user" },
    { id: "economy", label: "Ekonomi", icon: "dollar-sign" },
    { id: "ai", label: "AI & Hafıza", icon: "cpu" },
    { id: "tasks", label: "Görevler", icon: "list" },
  ];

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={TEXT_PRI} />
        </Pressable>
        <Pressable onPress={handleSecretTap}>
          <Text style={styles.headerTitle}>Admin Paneli</Text>
        </Pressable>
        <View style={styles.adminBadge}>
          <Feather name="shield" size={11} color="#FF9500" />
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
        {TABS.map(t => (
          <Pressable
            key={t.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(t.id); }}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive]}
          >
            <Feather name={t.icon as any} size={13} color={tab === t.id ? ACCENT : TEXT_SEC} />
            <Text style={[styles.tabLabel, tab === t.id && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

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
          {tab === "dashboard" && (
            <>
              <SectionTitle title="Genel İstatistikler" icon="bar-chart-2" />
              <StatGrid items={[
                { label: "Toplam Mesaj", value: String(totalMessages), color: "#007AFF", icon: "message-circle" },
                { label: "Aktif Sohbet", value: String(conversations.length), color: "#34C759", icon: "users" },
                { label: "Kullanıcı Mesajı", value: String(userMessages), color: "#FF9500", icon: "send" },
                { label: "Toplam XP", value: String(xp), color: "#AF52DE", icon: "zap" },
                { label: "VIP Durumu", value: user?.isVip ? "Aktif" : "Pasif", color: user?.isVip ? "#34C759" : "#FF3B30", icon: "star" },
                { label: "Bugünkü Mesaj", value: String(quota?.count ?? 0), color: "#FF6B35", icon: "activity" },
              ]} />

              <SectionTitle title="Karakter Kullanımı" icon="users" color="#34C759" />
              <Card>
                {CHARACTERS.map(char => {
                  const count = charUsage[char.id] ?? 0;
                  const pct = totalMessages > 0 ? count / totalMessages : 0;
                  return (
                    <View key={char.id} style={styles.charRow}>
                      <View style={[styles.charDot, { backgroundColor: char.gradientColors[0] }]} />
                      <Text style={styles.charName}>{char.name}</Text>
                      <View style={styles.charBarBg}>
                        <View style={[styles.charBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: char.gradientColors[0] }]} />
                      </View>
                      <Text style={styles.charCount}>{count}</Text>
                    </View>
                  );
                })}
              </Card>

              <SectionTitle title="Uygulama Sağlığı" icon="heart" color="#FF3B30" />
              <Card>
                <InfoRow label="En Popüler Karakter" value={topChar ? `${CHARACTERS.find(c => c.id === topChar[0])?.name ?? topChar[0]} (${topChar[1]} mesaj)` : "—"} />
                <InfoRow label="Ort. Mesaj/Sohbet" value={conversations.length > 0 ? String(Math.round(totalMessages / conversations.length)) : "0"} />
                <InfoRow label="Geri Bildirim Sayısı" value={String(feedbackList.length)} />
                <InfoRow label="Coin Bakiyesi" value={`${coins} coin`} />
                <InfoRow label="Bugün Kullanılan Kota" value={`${quota?.count ?? 0}/15`} />
                <InfoRow label="Bonus Mesaj" value={`+${quota?.bonusMessages ?? 0}`} />
              </Card>
            </>
          )}

          {tab === "user" && (
            <>
              <SectionTitle title="Kullanıcı Profili" icon="user" />
              <Card>
                <InfoRow label="İsim" value={user?.name ?? "—"} />
                <InfoRow label="Kullanıcı Adı" value={`@${user?.username ?? "—"}`} />
                <InfoRow label="E-posta" value={user?.email ?? "—"} />
                <InfoRow label="ID" value={user?.id ?? "—"} mono />
                <InfoRow label="Kullanıcı ID" value={user?.userId ?? "—"} />
                <InfoRow label="Dil" value={user?.language === "en" ? "English" : "Türkçe"} />
                <InfoRow label="Cinsiyet" value={user?.gender ?? "—"} />
                <InfoRow label="Doğum Tarihi" value={user?.birthdate ?? "—"} />
                <InfoRow label="Admin" value={user?.isAdmin ? "Evet" : "Hayır"} />
              </Card>

              <SectionTitle title="VIP Yönetimi" icon="star" color="#FFD700" />
              <Card>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.toggleLabel}>VIP Durumu</Text>
                    <Text style={styles.toggleSub}>{user?.isVip ? "Sınırsız mesaj aktif" : "Günlük 15 mesaj limiti"}</Text>
                  </View>
                  <Switch
                    value={!!user?.isVip}
                    onValueChange={toggleVIP}
                    trackColor={{ false: "rgba(255,255,255,0.15)", true: "#FFD700" }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={[styles.divider]} />
                <Pressable onPress={toggleVIP} style={[styles.actionBtn, { backgroundColor: user?.isVip ? "#FF3B3020" : "#FFD70020" }]}>
                  <Feather name={user?.isVip ? "x-circle" : "star"} size={15} color={user?.isVip ? "#FF3B30" : "#FFD700"} />
                  <Text style={[styles.actionBtnText, { color: user?.isVip ? "#FF3B30" : "#FFD700" }]}>
                    {user?.isVip ? "VIP'i Kaldır" : "VIP Ver"}
                  </Text>
                </Pressable>
              </Card>

              <SectionTitle title="Güvenlik & Erişim" icon="shield" color="#FF3B30" />
              <Card>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.toggleLabel}>Admin Erişimi</Text>
                    <Text style={styles.toggleSub}>Yönetici hakları</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: "#FF950020" }]}>
                    <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FF9500" }}>AKTİF</Text>
                  </View>
                </View>
                <View style={styles.divider} />
                <Pressable onPress={toggleBan} style={[styles.actionBtn, { backgroundColor: "#FF3B3015" }]}>
                  <Feather name="slash" size={15} color="#FF3B30" />
                  <Text style={[styles.actionBtnText, { color: "#FF3B30" }]}>Ban / Askıya Al</Text>
                </Pressable>
              </Card>

              <SectionTitle title="Hobiler & Bio" icon="heart" color="#AF52DE" />
              <Card>
                <InfoRow label="Bio" value={user?.bio || "—"} />
                <InfoRow label="Hobiler" value={user?.hobbies?.join(", ") || "—"} />
              </Card>
            </>
          )}

          {tab === "economy" && (
            <>
              <SectionTitle title="Coin Bakiyesi" icon="dollar-sign" color="#FFD700" />
              <Card>
                <View style={styles.coinDisplay}>
                  <Feather name="dollar-sign" size={32} color="#FFD700" />
                  <Text style={styles.coinAmount}>{coins}</Text>
                  <Text style={styles.coinLabel}>Coin</Text>
                </View>
                <View style={styles.divider} />
                <Text style={[styles.toggleSub, { marginBottom: 8 }]}>Manuel coin ekle:</Text>
                <View style={styles.coinRow}>
                  <TextInput
                    style={styles.coinInput}
                    value={coinInput}
                    onChangeText={setCoinInput}
                    placeholder="Miktar gir..."
                    placeholderTextColor={TEXT_TER}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                  <Pressable onPress={addCoinsAdmin} style={styles.coinAddBtn}>
                    <Feather name="plus" size={16} color="#fff" />
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

              <SectionTitle title="Günlük Kota" icon="activity" color="#FF9500" />
              <Card>
                <InfoRow label="Bugün Kullanılan" value={`${quota?.count ?? 0} mesaj`} />
                <InfoRow label="Bonus Mesajlar" value={`+${quota?.bonusMessages ?? 0}`} />
                <InfoRow label="Kalan" value={`${Math.max(0, 15 + (quota?.bonusMessages ?? 0) - (quota?.count ?? 0))} mesaj`} />
                <View style={styles.divider} />
                <Pressable onPress={resetQuota} style={[styles.actionBtn, { backgroundColor: "#FF950015" }]}>
                  <Feather name="refresh-cw" size={15} color="#FF9500" />
                  <Text style={[styles.actionBtnText, { color: "#FF9500" }]}>Kotayı Sıfırla</Text>
                </Pressable>
              </Card>

              <SectionTitle title="Envanter (Hediyeler)" icon="gift" color="#34C759" />
              <Card>
                {inventory.length === 0 ? (
                  <Text style={[styles.toggleSub, { textAlign: "center", paddingVertical: 12 }]}>Envanter boş</Text>
                ) : (
                  inventory.map(item => {
                    const gift = GIFTS.find(g => g.id === item.giftId);
                    return (
                      <View key={item.giftId} style={styles.invRow}>
                        <View style={[styles.invIcon, { backgroundColor: (gift?.colorFrom ?? "#888") + "30" }]}>
                          <Feather name={(gift?.icon ?? "gift") as any} size={14} color={gift?.colorFrom ?? "#888"} />
                        </View>
                        <Text style={styles.invName}>{gift?.name ?? item.giftId}</Text>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>x{item.quantity}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </Card>

              <SectionTitle title="Abonelik Bilgisi" icon="credit-card" color="#007AFF" />
              <Card>
                <InfoRow label="VIP Durumu" value={user?.isVip ? "Aktif" : "Pasif"} />
                <InfoRow label="Paket" value={user?.isVip ? "VIP Premium" : "Ücretsiz"} />
                <InfoRow label="Mağaza" value="Apple App Store" />
                <InfoRow label="Bitiş Tarihi" value={user?.isVip ? "Süresiz (Manuel)" : "—"} />
              </Card>
            </>
          )}

          {tab === "ai" && (
            <>
              <SectionTitle title="Karakter İstatistikleri" icon="users" color="#007AFF" />
              <Card>
                {CHARACTERS.map(char => {
                  const count = charUsage[char.id] ?? 0;
                  const conv = conversations.filter(c => c.characterId === char.id);
                  const streak = streaks?.[char.id]?.currentStreak ?? 0;
                  return (
                    <View key={char.id} style={styles.charStatRow}>
                      <View style={[styles.charDot, { backgroundColor: char.gradientColors[0], width: 10, height: 10, borderRadius: 5 }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.charStatName}>{char.name}</Text>
                        <Text style={styles.charStatSub}>{conv.length} sohbet · {count} mesaj · {streak} gün seri</Text>
                      </View>
                      <Pressable onPress={() => clearMemory(char.id)} style={styles.trashBtn} hitSlop={6}>
                        <Feather name="trash-2" size={14} color="#FF3B30" />
                      </Pressable>
                    </View>
                  );
                })}
              </Card>

              <SectionTitle title="AI Hafıza Görüntüleyici" icon="database" color="#AF52DE" />
              {CHARACTERS.map(char => {
                const settings = charSettings[char.id];
                const memories: string[] = settings?.memories ?? [];
                if (memories.length === 0) return null;
                return (
                  <Card key={char.id}>
                    <View style={styles.memHeader}>
                      <View style={[styles.charDot, { backgroundColor: char.gradientColors[0] }]} />
                      <Text style={styles.memCharName}>{char.name}</Text>
                      <Pressable onPress={() => clearMemory(char.id)} hitSlop={6}>
                        <Feather name="trash-2" size={14} color="#FF3B30" />
                      </Pressable>
                    </View>
                    {memories.map((mem, idx) => (
                      <View key={idx} style={styles.memRow}>
                        <View style={styles.memDot} />
                        <Text style={styles.memText}>{mem}</Text>
                      </View>
                    ))}
                  </Card>
                );
              })}

              <SectionTitle title="Global Sistem Promptu" icon="settings" color="#FF9500" />
              <Card>
                <Text style={[styles.toggleSub, { marginBottom: 10 }]}>
                  Tüm AI karakterlerinin davranışına eklenen global kural. Uygulamayı kapatmadan güncelle.
                </Text>
                <TextInput
                  style={styles.promptInput}
                  value={globalPrompt}
                  onChangeText={setGlobalPrompt}
                  placeholder="Global kural yaz... (örn: Her yanıtta bir emoji kullan)"
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
                  <Pressable onPress={saveGlobalPrompt} style={[styles.promptBtn, { flex: 1, backgroundColor: promptSaved ? "#34C75920" : ACCENT + "20" }]}>
                    {promptLoading ? <ActivityIndicator size="small" color={ACCENT} /> : <Feather name={promptSaved ? "check" : "save"} size={14} color={promptSaved ? "#34C759" : ACCENT} />}
                    <Text style={[styles.promptBtnText, { color: promptSaved ? "#34C759" : ACCENT }]}>
                      {promptSaved ? "Kaydedildi!" : "Kaydet"}
                    </Text>
                  </Pressable>
                </View>
              </Card>
            </>
          )}

          {tab === "tasks" && (
            <>
              <SectionTitle title="Push Bildirim Gönder" icon="bell" color="#FF9500" />
              <Card>
                <Text style={[styles.toggleSub, { marginBottom: 10 }]}>Tüm kullanıcılara anlık bildirim gönder:</Text>
                <TextInput
                  style={styles.notifInput}
                  value={notifTitle}
                  onChangeText={setNotifTitle}
                  placeholder="Bildirim başlığı..."
                  placeholderTextColor={TEXT_TER}
                  maxLength={50}
                />
                <TextInput
                  style={[styles.notifInput, { marginTop: 8, minHeight: 80, textAlignVertical: "top" }]}
                  value={notifBody}
                  onChangeText={setNotifBody}
                  placeholder="Bildirim mesajı..."
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
                <Pressable onPress={sendPushNotification} style={[styles.actionBtn, { backgroundColor: "#FF950020", marginTop: 4 }]}>
                  <Feather name="send" size={15} color="#FF9500" />
                  <Text style={[styles.actionBtnText, { color: "#FF9500" }]}>Bildirimi Gönder</Text>
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
                  <View style={{ padding: 24, alignItems: "center" }}>
                    <Feather name="inbox" size={28} color={TEXT_TER} />
                    <Text style={[styles.toggleSub, { marginTop: 8, textAlign: "center" }]}>Henüz geri bildirim yok</Text>
                  </View>
                ) : (
                  feedbackList.map(item => (
                    <View key={item.id} style={styles.fbCard}>
                      <View style={styles.fbCardTop}>
                        <View style={[styles.badge, { backgroundColor: (CAT_COLORS[item.category] ?? "#888") + "20" }]}>
                          <Text style={[styles.badgeText, { color: CAT_COLORS[item.category] ?? "#888" }]}>
                            {CAT_LABELS[item.category] ?? item.category}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(i => (
                            <Feather key={i} name="star" size={10} color={i <= item.rating ? "#FFD700" : TEXT_TER} />
                          ))}
                        </View>
                        <Text style={styles.fbDate}>{fmtDate(item.timestamp)}</Text>
                      </View>
                      <Text style={styles.fbText}>{item.text}</Text>
                    </View>
                  ))
                )}
              </Card>

              <SectionTitle title="Haftalık Görevler" icon="target" color="#AF52DE" />
              <Card>
                <Text style={[styles.toggleSub, { marginBottom: 8 }]}>
                  Mevcut haftalık görevler otomatik oluşturulur. Görevi sıfırlamak için tüm görev verisini temizle.
                </Text>
                <Pressable
                  onPress={() => {
                    Alert.alert("Görevleri Sıfırla", "Tüm haftalık görev ilerlemesini sıfırlamak istediğine emin misin?", [
                      { text: "İptal", style: "cancel" },
                      {
                        text: "Sıfırla", style: "destructive", onPress: async () => {
                          await AsyncStorage.removeItem(MISSIONS_KEY);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert("Sıfırlandı", "Haftalık görevler yeni haftada otomatik oluşacak.");
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
  tabScroll: { maxHeight: 52 },
  tabScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, alignItems: "center" },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)" },
  tabBtnActive: { backgroundColor: ACCENT + "25", borderWidth: 1, borderColor: ACCENT + "50" },
  tabLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT_SEC },
  tabLabelActive: { color: ACCENT, fontFamily: "Inter_600SemiBold" },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER, gap: 0 },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 2 },
  sectionIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  sectionTitleText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT_SEC, letterSpacing: 0.2, textTransform: "uppercase" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCell: { width: "30%", flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statVal: { fontSize: 18, fontFamily: "Inter_700Bold", color: TEXT_PRI, letterSpacing: -0.3 },
  statLbl: { fontSize: 10, fontFamily: "Inter_400Regular", color: TEXT_SEC, textAlign: "center" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: TEXT_SEC },
  infoValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_PRI, maxWidth: "60%", textAlign: "right" },
  charRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  charDot: { width: 8, height: 8, borderRadius: 4 },
  charName: { fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_PRI, width: 52 },
  charBarBg: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" },
  charBarFill: { height: 6, borderRadius: 3, minWidth: 3 },
  charCount: { fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT_SEC, width: 28, textAlign: "right" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: TEXT_PRI },
  toggleSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT_SEC, lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  badge: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: TEXT_SEC },
  coinDisplay: { alignItems: "center", gap: 6, paddingVertical: 8 },
  coinAmount: { fontSize: 48, fontFamily: "Inter_700Bold", color: "#FFD700", letterSpacing: -1 },
  coinLabel: { fontSize: 14, fontFamily: "Inter_400Regular", color: TEXT_SEC },
  coinRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  coinInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_500Medium", color: TEXT_PRI, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  coinAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  quickCoins: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  quickCoinBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER },
  quickCoinText: { fontSize: 12, fontFamily: "Inter_500Medium", color: TEXT_SEC },
  invRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  invIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  invName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: TEXT_PRI },
  charStatRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  charStatName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT_PRI },
  charStatSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: TEXT_SEC, marginTop: 2 },
  trashBtn: { padding: 6 },
  memHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  memCharName: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: TEXT_PRI },
  memRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  memDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: ACCENT, marginTop: 5 },
  memText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: TEXT_SEC, lineHeight: 18 },
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
