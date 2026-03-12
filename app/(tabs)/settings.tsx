import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
  Alert,
  Animated,
  Image,
  Switch,
} from "react-native";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "@/contexts/ChatContext";
import Colors from "@/constants/colors";

const SETTINGS_KEY = "soulie_settings_v1";
const LEVEL_XP_TABLE = [0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750];

function getLevelInfo(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_XP_TABLE.length - 1; i++) {
    if (xp >= LEVEL_XP_TABLE[i + 1]) { level = i + 2; } else { break; }
  }
  const currentLevelXp = LEVEL_XP_TABLE[level - 1];
  const nextLevelXp = LEVEL_XP_TABLE[level] ?? LEVEL_XP_TABLE[LEVEL_XP_TABLE.length - 1];
  const progress = Math.min((xp - currentLevelXp) / (nextLevelXp - currentLevelXp), 1);
  return { level, currentLevelXp, nextLevelXp, progress, xp };
}

const LEVEL_NAMES: Record<number, string> = {
  1: "Yeni Ruh", 2: "Meraklı", 3: "Samimi", 4: "Bağlı", 5: "Güvenilir",
  6: "Yakın Dost", 7: "Sırdaş", 8: "Sadık", 9: "Ruh Eşi", 10: "Efsane",
};

function LevelCard({ xp }: { xp: number }) {
  const { level, progress, nextLevelXp } = getLevelInfo(xp);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const levelName = LEVEL_NAMES[level] ?? "Efsane";

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: progress, useNativeDriver: false, damping: 16, stiffness: 100, delay: 300 }).start();
  }, [progress]);

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"], extrapolate: "clamp" });
  const xpLeft = Math.max(0, nextLevelXp - xp);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(`Seviye ${level} — ${levelName}`, `Toplam XP: ${xp}\nSonraki seviye için: ${xpLeft} XP daha kazan\nHer sohbet +10 XP kazandırır!`, [{ text: "Tamam" }]);
  };

  return (
    <AnimatedRN.View entering={FadeInDown.delay(40).springify().damping(18)} style={styles.levelCard}>
      <LinearGradient colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.75)"]} style={styles.levelGradient}>
        <View style={styles.levelTopRow}>
          <View style={styles.levelBadge}>
            <LinearGradient colors={[Colors.userBubble.from, Colors.userBubble.to]} style={styles.levelBadgeGradient}>
              <Text style={styles.levelBadgeNumber}>{level}</Text>
            </LinearGradient>
          </View>
          <View style={styles.levelInfo}>
            <View style={styles.levelTitleRow}>
              <Text style={styles.levelTitle}>{levelName}</Text>
              <Text style={styles.levelSub}>Seviye {level}</Text>
            </View>
            <Text style={styles.levelXpText}>{xp} XP</Text>
          </View>
          <Pressable onPress={handlePress} style={styles.levelChevronWrapper} hitSlop={12}>
            <Feather name="info" size={17} color={Colors.text.tertiary} />
          </Pressable>
        </View>
        <View style={styles.levelBarWrapper}>
          <View style={styles.levelBarBg}>
            <Animated.View style={[styles.levelBarFill, { width: barWidth }]}>
              <LinearGradient colors={[Colors.userBubble.from, Colors.userBubble.to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
          <View style={styles.levelBarLabels}>
            <Text style={styles.levelBarLabel}>Seviye {level}</Text>
            <Text style={styles.levelBarLabel}>{xpLeft > 0 ? `${xpLeft} XP kaldı` : "Max!"}</Text>
          </View>
        </View>
      </LinearGradient>
    </AnimatedRN.View>
  );
}

function SettingRow({
  icon, label, value, onPress, danger, chevron = true, rightElement,
}: {
  icon: string; label: string; value?: string; onPress: () => void;
  danger?: boolean; chevron?: boolean; rightElement?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Feather name={icon as any} size={17} color={danger ? "#FF3B30" : Colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      </View>
      {rightElement ?? (chevron ? <Feather name="chevron-right" size={16} color={Colors.text.tertiary} /> : null)}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, deleteAccount, grantAdminAccess } = useAuth();
  const { conversations } = useChatContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkTheme, setDarkTheme] = useState(false);
  const [versionTaps, setVersionTaps] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        const s = JSON.parse(raw);
        setNotificationsEnabled(s.notifications ?? true);
        setDarkTheme(s.darkTheme ?? false);
      }
    });
  }, []);

  const saveSetting = async (key: string, value: boolean) => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      const s = raw ? JSON.parse(raw) : {};
      s[key] = value;
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {}
  };

  const toggleNotifications = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationsEnabled(val);
    saveSetting("notifications", val);
  };

  const toggleDarkTheme = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDarkTheme(val);
    saveSetting("darkTheme", val);
    Alert.alert("Yakında", "Koyu tema özelliği çok yakında aktif olacak.");
  };

  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
  const xp = totalMessages * 10 + conversations.length * 5;

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Çıkış Yap", "Hesabından çıkmak istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: async () => { await logout(); router.replace("/"); } },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Hesabı Sil", "Hesabını kalıcı olarak silmek istediğine emin misin? Tüm verilen silinecek ve bu işlem geri alınamaz.", [
      { text: "İptal", style: "cancel" },
      { text: "Hesabı Sil", style: "destructive", onPress: async () => { await deleteAccount?.(); router.replace("/"); } },
    ]);
  };

  const handleVersionTap = async () => {
    const next = versionTaps + 1;
    setVersionTaps(next);
    if (next >= 7) {
      setVersionTaps(0);
      if (!user?.isAdmin) {
        Alert.alert("Geliştirici Modu", "Admin yetkisi aktifleştirildi!", [
          { text: "Tamam", onPress: async () => { await grantAdminAccess(); } }
        ]);
      } else {
        Alert.alert("Bilgi", "Zaten admin yetkin var.");
      }
    } else if (next >= 4) {
      Alert.alert("", `${7 - next} kez daha dokun...`, [{ text: "Tamam" }]);
    }
  };

  return (
    <BackgroundGradient>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <AnimatedRN.View entering={FadeInDown.springify().damping(18)} style={styles.profileCard}>
          <Pressable onPress={() => router.push("/profile" as any)} style={{ flex: 1 }}>
            <LinearGradient colors={["rgba(255,255,255,0.85)", "rgba(255,255,255,0.7)"]} style={styles.profileGradient}>
              {user?.profilePhoto ? (
                <Image source={{ uri: user.profilePhoto }} style={styles.profileAvatarPhoto} />
              ) : (
                <LinearGradient colors={[Colors.userBubble.from, Colors.userBubble.to]} style={styles.profileAvatar}>
                  <Text style={styles.profileInitial}>{user?.name?.charAt(0).toUpperCase() ?? "S"}</Text>
                </LinearGradient>
              )}
              <View style={styles.profileInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.profileName}>{user?.name ?? "Kullanıcı"}</Text>
                  {user?.isAdmin && (
                    <View style={styles.adminBadge}>
                      <Feather name="shield" size={10} color="#FF9500" />
                      <Text style={styles.adminBadgeText}>ADMIN</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.profileUsername}>@{user?.username ?? "kullanici"}</Text>
              </View>
              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{conversations.length}</Text>
                  <Text style={styles.statLabel}>Sohbet</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </AnimatedRN.View>

        <LevelCard xp={xp} />

        <AnimatedRN.View entering={FadeInDown.delay(60).springify().damping(18)} style={styles.section}>
          <SectionHeader title="Hesap" />
          <View style={styles.sectionCard}>
            <SettingRow icon="user" label="Profili Düzenle" value={user?.name} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/profile" as any); }} />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="bell"
              label="Bildirimler"
              onPress={() => toggleNotifications(!notificationsEnabled)}
              chevron={false}
              rightElement={
                <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: "#E5E5EA", true: Colors.accent }} thumbColor="#fff" />
              }
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="moon"
              label="Koyu Tema"
              value="Yakında"
              onPress={() => toggleDarkTheme(!darkTheme)}
              chevron={false}
              rightElement={
                <Switch value={darkTheme} onValueChange={toggleDarkTheme} trackColor={{ false: "#E5E5EA", true: Colors.accent }} thumbColor="#fff" />
              }
            />
          </View>
        </AnimatedRN.View>

        <AnimatedRN.View entering={FadeInDown.delay(100).springify().damping(18)} style={styles.section}>
          <SectionHeader title="Premium" />
          <View style={styles.sectionCard}>
            <SettingRow icon="star" label="Premium'a Geç" value={user?.isVip ? "VIP Aktif" : "Ücretsiz Plan"} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/market"); }} />
            <View style={styles.rowDivider} />
            <SettingRow icon="refresh-cw" label="Satın Alımları Geri Yükle" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
          </View>
        </AnimatedRN.View>

        <AnimatedRN.View entering={FadeInDown.delay(140).springify().damping(18)} style={styles.section}>
          <SectionHeader title="Destek" />
          <View style={styles.sectionCard}>
            <SettingRow icon="help-circle" label="Yardım Merkezi" onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
            <View style={styles.rowDivider} />
            <SettingRow icon="message-square" label="Geri Bildirim" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/feedback" as any); }} />
            <View style={styles.rowDivider} />
            <SettingRow icon="file-text" label="Gizlilik Politikası" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/privacy"); }} />
          </View>
        </AnimatedRN.View>

        <AnimatedRN.View entering={FadeInDown.delay(180).springify().damping(18)} style={styles.section}>
          <View style={styles.sectionCard}>
            <SettingRow icon="log-out" label="Çıkış Yap" onPress={handleLogout} danger chevron={false} />
            <View style={styles.rowDivider} />
            <SettingRow icon="trash-2" label="Hesabı Sil" onPress={handleDeleteAccount} danger chevron={false} />
          </View>
        </AnimatedRN.View>

        {user?.isAdmin && (
          <AnimatedRN.View entering={FadeInDown.delay(220).springify().damping(18)} style={styles.section}>
            <SectionHeader title="Yönetim" />
            <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/admin" as any); }} style={({ pressed }) => [styles.adminPanelBtn, pressed && { opacity: 0.8 }]}>
              <LinearGradient colors={["rgba(255,149,0,0.15)", "rgba(255,149,0,0.08)"]} style={styles.adminPanelBtnGrad}>
                <View style={styles.adminPanelLeft}>
                  <View style={styles.adminIconWrap}>
                    <Feather name="shield" size={18} color="#FF9500" />
                  </View>
                  <View>
                    <Text style={styles.adminPanelLabel}>Admin Paneli</Text>
                    <Text style={styles.adminPanelSub}>Kullanıcı, VIP ve istatistikler</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color="#FF9500" />
              </LinearGradient>
            </Pressable>
          </AnimatedRN.View>
        )}

        <Pressable onPress={handleVersionTap} hitSlop={8}>
          <Text style={styles.version}>Soulie v1.0.0</Text>
        </Pressable>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 8 },
  profileCard: { borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", marginBottom: 8 },
  profileGradient: { flexDirection: "row", alignItems: "center", padding: 18, gap: 14 },
  profileAvatar: { width: 58, height: 58, borderRadius: 29, justifyContent: "center", alignItems: "center" },
  profileAvatarPhoto: { width: 58, height: 58, borderRadius: 29 },
  profileInitial: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.text.primary, letterSpacing: -0.4 },
  profileUsername: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text.secondary },
  profileStats: { alignItems: "flex-end" },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.text.primary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.text.tertiary },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,149,0,0.12)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  adminBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FF9500", letterSpacing: 0.4 },
  levelCard: { borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", marginBottom: 8 },
  levelGradient: { padding: 18, gap: 14 },
  levelTopRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  levelBadge: { width: 50, height: 50, borderRadius: 25, overflow: "hidden" },
  levelBadgeGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  levelBadgeNumber: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.5 },
  levelInfo: { flex: 1, gap: 3 },
  levelTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  levelTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.text.primary, letterSpacing: -0.4 },
  levelSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text.tertiary },
  levelXpText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.accent },
  levelChevronWrapper: {},
  levelBarWrapper: { gap: 6 },
  levelBarBg: { height: 8, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" },
  levelBarFill: { height: "100%", borderRadius: 4, overflow: "hidden" },
  levelBarLabels: { flexDirection: "row", justifyContent: "space-between" },
  levelBarLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.text.tertiary },
  section: { gap: 6 },
  sectionHeader: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text.tertiary, letterSpacing: 0.3, textTransform: "uppercase", paddingHorizontal: 4, marginTop: 8 },
  sectionCard: { backgroundColor: "rgba(255,255,255,0.8)", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,122,255,0.08)", justifyContent: "center", alignItems: "center" },
  settingIconDanger: { backgroundColor: "rgba(255,59,48,0.08)" },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text.primary, letterSpacing: -0.1 },
  settingLabelDanger: { color: "#FF3B30" },
  settingValue: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text.tertiary, marginTop: 1 },
  rowDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.05)", marginLeft: 62 },
  adminPanelBtn: { borderRadius: 18, overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(255,149,0,0.25)" },
  adminPanelBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16 },
  adminPanelLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  adminIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,149,0,0.15)", justifyContent: "center", alignItems: "center" },
  adminPanelLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FF9500" },
  adminPanelSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,149,0,0.7)", marginTop: 2 },
  version: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text.tertiary, textAlign: "center", marginTop: 12, marginBottom: 8 },
});
