import React, { useState, useEffect, useCallback } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "@/contexts/ChatContext";
import Colors from "@/constants/colors";

const FEEDBACK_KEY = "soulie_feedback_v1";
const ACCENT = Colors.accent;

type FeedbackEntry = {
  id: string;
  category: string;
  rating: number;
  text: string;
  timestamp: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Hata",
  suggestion: "Öneri",
  praise: "Beğeni",
  other: "Diğer",
};

const CATEGORY_COLORS: Record<string, string> = {
  bug: "#FF3B30",
  suggestion: "#007AFF",
  praise: "#34C759",
  other: "#8E8E93",
};

type Tab = "stats" | "vip" | "feedback";

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient colors={[color + "20", color + "08"]} style={styles.statIconBg}>
        <Feather name={icon} size={20} color={color} />
      </LinearGradient>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { user, updateProfile } = useAuth();
  const { conversations } = useChatContext();

  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);
  const [secretTaps, setSecretTaps] = useState(0);

  useEffect(() => {
    if (!user?.isAdmin) return;
    AsyncStorage.getItem(FEEDBACK_KEY).then((raw) => {
      if (raw) setFeedbackList(JSON.parse(raw));
      setFeedbackLoaded(true);
    });
  }, [user?.isAdmin]);

  if (!user?.isAdmin) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Feather name="lock" size={40} color={Colors.text.tertiary} />
        <Text style={styles.accessDenied}>Erişim Reddedildi</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtnCenter}>
          <Text style={styles.backBtnCenterText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
  const totalChars = new Set(conversations.map((c) => c.characterId)).size;
  const avgMessages = conversations.length > 0 ? Math.round(totalMessages / conversations.length) : 0;
  const xp = totalMessages * 10 + conversations.length * 5;

  const toggleVIP = async () => {
    const newVip = !user?.isVip;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProfile({ isVip: newVip });
    Alert.alert(
      newVip ? "VIP Aktifleştirildi" : "VIP Devre Dışı",
      newVip ? "Hesabın artık VIP. Sınırsız mesaj gönderebilirsin." : "Hesabın normal kullanıcıya döndürüldü."
    );
  };

  const clearFeedback = () => {
    Alert.alert("Geri Bildirimleri Sil", "Tüm geri bildirimleri silmek istediğine emin misin?", [
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
      Alert.alert("Gizli", `User ID: ${user?.id}\nEmail: ${user?.email ?? "yok"}\nAdmin: ${user?.isAdmin}`);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const renderFeedback = ({ item }: { item: FeedbackEntry }) => (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <View style={[styles.feedbackCatBadge, { backgroundColor: (CATEGORY_COLORS[item.category] ?? "#888") + "15" }]}>
          <Text style={[styles.feedbackCatText, { color: CATEGORY_COLORS[item.category] ?? "#888" }]}>
            {CATEGORY_LABELS[item.category] ?? item.category}
          </Text>
        </View>
        <View style={styles.feedbackStars}>
          {[1, 2, 3, 4, 5].map(i => (
            <Feather key={i} name="star" size={11} color={i <= item.rating ? "#FFD700" : "#E5E5EA"} />
          ))}
        </View>
        <Text style={styles.feedbackDate}>{formatDate(item.timestamp)}</Text>
      </View>
      <Text style={styles.feedbackText}>{item.text}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.navBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={Colors.text.primary} />
        </Pressable>
        <Pressable onPress={handleSecretTap}>
          <Text style={styles.navTitle}>Admin Paneli</Text>
        </Pressable>
        <View style={styles.adminBadge}>
          <Feather name="shield" size={12} color="#FF9500" />
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {([
          { id: "stats", label: "İstatistikler", icon: "bar-chart-2" },
          { id: "vip", label: "VIP Yönetim", icon: "star" },
          { id: "feedback", label: "Geri Bildirimler", icon: "message-square" },
        ] as { id: Tab; label: string; icon: any }[]).map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab.id); }}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
          >
            <Feather name={tab.icon} size={14} color={activeTab === tab.id ? ACCENT : Colors.text.secondary} />
            <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "stats" && (
        <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: botPad + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            <StatCard icon="message-circle" label="Toplam Mesaj" value={String(totalMessages)} color="#007AFF" />
            <StatCard icon="users" label="Aktif Sohbet" value={String(conversations.length)} color="#34C759" />
            <StatCard icon="zap" label="Toplam XP" value={String(xp)} color="#FF9500" />
            <StatCard icon="user" label="Karakter Sayısı" value={String(totalChars)} color="#AF52DE" />
            <StatCard icon="trending-up" label="Ort. Mesaj/Sohbet" value={String(avgMessages)} color="#FF3B30" />
            <StatCard icon="star" label="VIP Durumu" value={user?.isVip ? "Aktif" : "Pasif"} color="#FFD700" />
          </View>

          <View style={styles.userInfoCard}>
            <Text style={styles.userInfoTitle}>Kullanıcı Bilgileri</Text>
            {[
              { label: "ID", value: user?.id?.slice(0, 12) + "..." },
              { label: "Ad", value: user?.name },
              { label: "Kullanıcı Adı", value: "@" + user?.username },
              { label: "Email", value: user?.email ?? "—" },
              { label: "Dil", value: user?.language === "en" ? "English" : "Türkçe" },
              { label: "Admin", value: user?.isAdmin ? "Evet" : "Hayır" },
            ].map(({ label, value }) => (
              <View key={label} style={styles.userInfoRow}>
                <Text style={styles.userInfoLabel}>{label}</Text>
                <Text style={styles.userInfoValue}>{value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {activeTab === "vip" && (
        <ScrollView contentContainerStyle={[styles.tabContent, { paddingBottom: botPad + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.vipCard}>
            <LinearGradient colors={["rgba(255,215,0,0.12)", "rgba(255,149,0,0.06)"]} style={styles.vipCardGrad}>
              <View style={styles.vipCardTop}>
                <View style={styles.vipIconWrap}>
                  <Feather name="star" size={24} color="#FFD700" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vipCardTitle}>VIP Erişim Yönetimi</Text>
                  <Text style={styles.vipCardSub}>{user?.name ?? "Kullanıcı"} için VIP durumunu yönet</Text>
                </View>
                <Switch
                  value={!!user?.isVip}
                  onValueChange={toggleVIP}
                  trackColor={{ false: "#E5E5EA", true: "#FFD700" }}
                  thumbColor="#fff"
                />
              </View>
              <View style={styles.vipStatusRow}>
                <View style={[styles.vipStatusDot, { backgroundColor: user?.isVip ? "#34C759" : "#FF3B30" }]} />
                <Text style={styles.vipStatusText}>
                  {user?.isVip ? "VIP aktif — sınırsız mesaj" : "VIP pasif — günlük 15 mesaj limiti"}
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.infoBox}>
            <Feather name="info" size={14} color={ACCENT} />
            <Text style={styles.infoBoxText}>
              VIP aktif olduğunda kullanıcı sınırsız mesaj gönderebilir, video sohbet açılır ve tüm premium özellikler kullanılabilir hale gelir.
            </Text>
          </View>

          <Pressable onPress={toggleVIP} style={styles.bigVipBtn}>
            <LinearGradient
              colors={user?.isVip ? ["#FF3B30", "#FF6B60"] : ["#FFD700", "#FF9500"]}
              style={styles.bigVipBtnGrad}
            >
              <Feather name={user?.isVip ? "x-circle" : "star"} size={18} color="#fff" />
              <Text style={styles.bigVipBtnText}>
                {user?.isVip ? "VIP'i Kaldır" : "VIP Ver"}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      )}

      {activeTab === "feedback" && (
        <View style={{ flex: 1 }}>
          <View style={styles.feedbackTopBar}>
            <Text style={styles.feedbackCount}>{feedbackList.length} geri bildirim</Text>
            {feedbackList.length > 0 && (
              <Pressable onPress={clearFeedback} style={styles.clearBtn}>
                <Feather name="trash-2" size={14} color="#FF3B30" />
                <Text style={styles.clearBtnText}>Temizle</Text>
              </Pressable>
            )}
          </View>
          {feedbackLoaded && feedbackList.length === 0 ? (
            <View style={styles.emptyFeedback}>
              <Feather name="message-square" size={36} color={Colors.text.tertiary} />
              <Text style={styles.emptyFeedbackText}>Henüz geri bildirim yok</Text>
            </View>
          ) : (
            <FlatList
              data={feedbackList}
              keyExtractor={(item) => item.id}
              renderItem={renderFeedback}
              contentContainerStyle={[{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: botPad + 40 }]}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8FC" },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.08)" },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text.primary },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,149,0,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  adminBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#FF9500", letterSpacing: 0.5 },
  tabs: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)" },
  tabActive: { backgroundColor: Colors.accent + "15", borderWidth: 1.5, borderColor: Colors.accent + "30" },
  tabLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.text.secondary },
  tabLabelActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  tabContent: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statIconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.text.secondary, textAlign: "center" },
  userInfoCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" },
  userInfoTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text.primary, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.06)" },
  userInfoRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.04)", justifyContent: "space-between" },
  userInfoLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text.secondary },
  userInfoValue: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text.primary, maxWidth: "60%", textAlign: "right" },
  vipCard: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,215,0,0.3)" },
  vipCardGrad: { padding: 20, gap: 12 },
  vipCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  vipIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,215,0,0.15)", justifyContent: "center", alignItems: "center" },
  vipCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.text.primary },
  vipCardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text.secondary, marginTop: 2 },
  vipStatusRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  vipStatusDot: { width: 8, height: 8, borderRadius: 4 },
  vipStatusText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text.secondary, flex: 1 },
  infoBox: { flexDirection: "row", gap: 10, backgroundColor: Colors.accent + "10", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.accent + "20" },
  infoBoxText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text.secondary, lineHeight: 18 },
  bigVipBtn: { borderRadius: 16, overflow: "hidden" },
  bigVipBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  bigVipBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  feedbackTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.06)" },
  feedbackCount: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text.secondary },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: "rgba(255,59,48,0.08)" },
  clearBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#FF3B30" },
  feedbackCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, gap: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)" },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  feedbackCatBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  feedbackCatText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  feedbackStars: { flexDirection: "row", gap: 2 },
  feedbackDate: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.text.tertiary, marginLeft: "auto" },
  feedbackText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text.primary, lineHeight: 20 },
  emptyFeedback: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyFeedbackText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text.tertiary },
  accessDenied: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text.secondary, marginTop: 12 },
  backBtnCenter: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.accent + "15", borderRadius: 14 },
  backBtnCenterText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.accent },
});
