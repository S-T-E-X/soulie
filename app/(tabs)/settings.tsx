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
import { logEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "@/contexts/ChatContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/hooks/useI18n";
import { getLevelName } from "@/constants/levelNames";
import { getApiUrl } from "@/lib/query-client";
import { useSubscription } from "@/lib/revenuecat";

const DEFAULT_AVATAR_SETTINGS = require("@/assets/default_pp/default-avatar-profile.png");

const LEVEL_IMAGES: Record<number, any> = {
  1: require("@/assets/levels/lvl1.png"),
  2: require("@/assets/levels/lvl2.png"),
  3: require("@/assets/levels/lvl3.png"),
  4: require("@/assets/levels/lvl4.png"),
  5: require("@/assets/levels/lvl5.png"),
  6: require("@/assets/levels/lvl6.png"),
  7: require("@/assets/levels/lvl7.png"),
  8: require("@/assets/levels/lvl8.png"),
  9: require("@/assets/levels/lvl9.png"),
  10: require("@/assets/levels/lvl10.png"),
  11: require("@/assets/levels/lvl11.png"),
  12: require("@/assets/levels/lvl12.png"),
  13: require("@/assets/levels/lvl13.png"),
  14: require("@/assets/levels/lvl14.png"),
  15: require("@/assets/levels/lvl15.png"),
  16: require("@/assets/levels/lvl16.png"),
  17: require("@/assets/levels/lvl17.png"),
  18: require("@/assets/levels/lvl18.png"),
  19: require("@/assets/levels/lvl19.png"),
  20: require("@/assets/levels/lvl20.png"),
  21: require("@/assets/levels/lvl21.png"),
  22: require("@/assets/levels/lvl22.png"),
  23: require("@/assets/levels/lvl23.png"),
  24: require("@/assets/levels/lvl24.png"),
  25: require("@/assets/levels/lvl25.png"),
  26: require("@/assets/levels/lvl26.png"),
  27: require("@/assets/levels/lvl27.png"),
  28: require("@/assets/levels/lvl28.png"),
  29: require("@/assets/levels/lvl29.png"),
  30: require("@/assets/levels/lvl30.png"),
  31: require("@/assets/levels/lvl31.png"),
  32: require("@/assets/levels/lvl32.png"),
};

const SETTINGS_KEY = "soulie_settings_v1";
const LEVEL_XP_TABLE = [
  0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750, 3300, 3900, 4550, 5250, 6000,
  6800, 7650, 8550, 9500, 10500, 11550, 12650, 13800, 15000, 16250, 17550, 18900, 20300, 21750, 23250, 24800,
];

function getLevelInfo(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_XP_TABLE.length - 1; i++) {
    if (xp >= LEVEL_XP_TABLE[i + 1]) { level = i + 2; } else { break; }
  }
  level = Math.min(level, 32);
  const currentLevelXp = LEVEL_XP_TABLE[level - 1];
  const nextLevelXp = LEVEL_XP_TABLE[level] ?? LEVEL_XP_TABLE[LEVEL_XP_TABLE.length - 1];
  const progress = Math.min((xp - currentLevelXp) / (nextLevelXp - currentLevelXp), 1);
  return { level, currentLevelXp, nextLevelXp, progress, xp };
}


function LevelCard({ xp, isDark, language }: { xp: number; isDark: boolean; language?: string }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { level, progress, nextLevelXp } = getLevelInfo(xp);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const levelName = getLevelName(level, language);

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: progress, useNativeDriver: false, damping: 16, stiffness: 100, delay: 300 }).start();
  }, [progress]);

  const barWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"], extrapolate: "clamp" });
  const xpLeft = Math.max(0, nextLevelXp - xp);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t("settings.level", { level, name: levelName }),
      t("settings.levelInfo", { xp, xpLeft }),
      [{ text: t("common.ok") }]
    );
  };

  const borderClr = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.5)";
  const levelImage = LEVEL_IMAGES[level] ?? LEVEL_IMAGES[1];

  return (
    <AnimatedRN.View entering={FadeInDown.delay(40).springify().damping(18)} style={[styles.levelCard, { borderColor: borderClr }]}>
      <LinearGradient colors={isDark ? ["rgba(35,35,58,0.95)", "rgba(28,28,48,0.9)"] : ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.75)"]} style={styles.levelGradient}>
        <View style={styles.levelTopRow}>
          <View style={styles.levelBadge}>
            <Image source={levelImage} style={styles.levelBadgeImage} />
          </View>
          <View style={styles.levelInfo}>
            <View style={styles.levelTitleRow}>
              <Text style={[styles.levelTitle, { color: colors.text.primary }]}>{levelName}</Text>
              <Text style={[styles.levelSub, { color: colors.text.tertiary }]}>{t("character.level")} {level}</Text>
            </View>
            <Text style={[styles.levelXpText, { color: colors.accent }]}>{xp} XP</Text>
          </View>
          <Pressable onPress={handlePress} style={styles.levelChevronWrapper} hitSlop={12}>
            <Feather name="info" size={17} color={colors.text.tertiary} />
          </Pressable>
        </View>
        <View style={styles.levelBarWrapper}>
          <View style={[styles.levelBarBg, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
            <Animated.View style={[styles.levelBarFill, { width: barWidth }]}>
              <LinearGradient colors={["#007AFF", "#0059C4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
          <View style={styles.levelBarLabels}>
            <Text style={[styles.levelBarLabel, { color: colors.text.tertiary }]}>{t("character.level")} {level}</Text>
            <Text style={[styles.levelBarLabel, { color: colors.text.tertiary }]}>{xpLeft > 0 ? t("settings.xpLeft", { xp: xpLeft }) : t("settings.maxLevel")}</Text>
          </View>
        </View>
      </LinearGradient>
    </AnimatedRN.View>
  );
}

function SettingRow({
  icon, label, value, onPress, danger, chevron = true, rightElement, isDark,
}: {
  icon: string; label: string; value?: string; onPress: () => void;
  danger?: boolean; chevron?: boolean; rightElement?: React.ReactNode; isDark: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger, { backgroundColor: danger ? "rgba(255,59,48,0.08)" : isDark ? "rgba(10,132,255,0.12)" : "rgba(0,122,255,0.08)" }]}>
        <Feather name={icon as any} size={17} color={danger ? "#FF3B30" : colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, { color: danger ? "#FF3B30" : colors.text.primary }]}>{label}</Text>
        {value ? <Text style={[styles.settingValue, { color: colors.text.tertiary }]}>{value}</Text> : null}
      </View>
      {rightElement ?? (chevron ? <Feather name="chevron-right" size={16} color={colors.text.tertiary} /> : null)}
    </Pressable>
  );
}

function SectionHeader({ title, isDark }: { title: string; isDark: boolean }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionHeader, { color: colors.text.tertiary }]}>{title}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, deleteAccount } = useAuth();
  const { conversations } = useChatContext();
  const { isDark, colors, toggleTheme } = useTheme();
  const { t } = useI18n();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { restore } = useSubscription();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [serverXp, setServerXp] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const url = new URL(`/api/users/xp/${user.id}`, getApiUrl());
    fetch(url.toString())
      .then(r => r.json())
      .then(d => { if (d.total_xp) setServerXp(d.total_xp); })
      .catch(() => {});
  }, [user?.id]);

  const handleRestorePurchases = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await restore();
      Alert.alert(t("settings.restorePurchases"), t("settings.restoreSuccess") || "Satın alımlar geri yüklendi!");
    } catch {
      Alert.alert(t("settings.restorePurchases"), t("settings.restoreFailed") || "Geri yükleme başarısız oldu.");
    }
  };

  useEffect(() => {
    if (user?.id) logEvent(user.id, "screen_view", "settings");
  }, [user?.id]);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        const s = JSON.parse(raw);
        setNotificationsEnabled(s.notifications ?? true);
      }
    });
  }, []);

  const toggleNotifications = (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationsEnabled(val);
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      const s = raw ? JSON.parse(raw) : {};
      s.notifications = val;
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    });
  };

  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
  const localXp = totalMessages * 10 + conversations.length * 5;
  const xp = Math.max(localXp, serverXp);

  useEffect(() => {
    if (!user?.id) return;
    const levelInfo = (() => {
      let level = 1;
      const LEVEL_XP_TABLE = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000, 26000, 30500, 35500, 41000, 47000, 53500, 60500, 68000, 76000, 84500, 93500, 103000, 113000];
      for (let i = 0; i < LEVEL_XP_TABLE.length - 1; i++) {
        if (xp >= LEVEL_XP_TABLE[i + 1]) { level = i + 2; } else { break; }
      }
      return Math.min(level, 32);
    })();
    const url = new URL("/api/users/sync-xp", getApiUrl());
    fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, totalXp: xp, level: levelInfo }),
    }).catch(() => {});
  }, [user?.id, xp]);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t("settings.logoutConfirm"), t("settings.logoutMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.logout"), style: "destructive", onPress: async () => { await logout(); router.replace("/"); } },
    ]);
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t("settings.deleteConfirm"), t("settings.deleteMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.deleteAccount"), style: "destructive", onPress: async () => { await deleteAccount?.(); router.replace("/"); } },
    ]);
  };

  const cardBg = isDark ? "rgba(28,28,48,0.92)" : "rgba(255,255,255,0.8)";
  const cardBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.5)";
  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  return (
    <BackgroundGradient>
      <StatusBar barStyle={colors.statusBar} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <AnimatedRN.View entering={FadeInDown.springify().damping(18)} style={[styles.profileCard, { borderColor: cardBorder }]}>
          <Pressable onPress={() => router.push("/profile" as any)} style={{ flex: 1 }}>
            <LinearGradient
              colors={isDark ? ["rgba(35,35,58,0.95)", "rgba(28,28,48,0.9)"] : ["rgba(255,255,255,0.85)", "rgba(255,255,255,0.7)"]}
              style={styles.profileGradient}
            >
              <Image source={user?.profilePhoto ? { uri: user.profilePhoto } : DEFAULT_AVATAR_SETTINGS} style={styles.profileAvatarPhoto} />
              <View style={styles.profileInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.profileName, { color: colors.text.primary }]}>{user?.name ?? t("settings.user")}</Text>
                  {user?.isVip && (
                    <View style={[styles.vipBadge]}>
                      <Feather name="star" size={10} color="#FFD700" />
                      <Text style={styles.vipBadgeText}>VIP</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.profileUsername, { color: colors.text.tertiary }]}>
                  ID: {user?.userId ?? "------"}
                </Text>
              </View>
              <View style={styles.profileStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: colors.text.primary }]}>{conversations.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.text.tertiary }]}>{t("settings.chats")}</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </AnimatedRN.View>

        <LevelCard xp={xp} isDark={isDark} language={user?.language} />

        <AnimatedRN.View entering={FadeInDown.delay(60).springify().damping(18)} style={styles.section}>
          <SectionHeader title={t("settings.account")} isDark={isDark} />
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <SettingRow icon="user" label={t("settings.editProfile")} value={user?.name} isDark={isDark} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/profile" as any); }} />
            <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
            <SettingRow
              icon="bell"
              label={t("settings.notifications")}
              isDark={isDark}
              onPress={() => toggleNotifications(!notificationsEnabled)}
              chevron={false}
              rightElement={
                <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: isDark ? "#3A3A3C" : "#E5E5EA", true: colors.accent }} thumbColor="#fff" />
              }
            />
            <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
            <SettingRow
              icon="moon"
              label={t("settings.darkMode")}
              isDark={isDark}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }}
              chevron={false}
              rightElement={
                <Switch value={isDark} onValueChange={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleTheme(); }} trackColor={{ false: isDark ? "#3A3A3C" : "#E5E5EA", true: colors.accent }} thumbColor="#fff" />
              }
            />
          </View>
        </AnimatedRN.View>

        <AnimatedRN.View entering={FadeInDown.delay(100).springify().damping(18)} style={styles.section}>
          <SectionHeader title={t("settings.premium")} isDark={isDark} />
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <SettingRow icon="star" label={t("settings.upgradePremium")} isDark={isDark} value={user?.isVip ? t("settings.vipActive") : t("settings.freePlan")} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/market"); }} />
            <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
            <SettingRow icon="refresh-cw" label={t("settings.restorePurchases")} isDark={isDark} onPress={handleRestorePurchases} />
          </View>
        </AnimatedRN.View>

        <AnimatedRN.View entering={FadeInDown.delay(140).springify().damping(18)} style={styles.section}>
          <SectionHeader title={t("settings.support")} isDark={isDark} />
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <SettingRow icon="message-square" label={t("settings.feedback")} isDark={isDark} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/feedback" as any); }} />
            <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
            <SettingRow icon="file-text" label={t("settings.privacyPolicy")} isDark={isDark} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/privacy"); }} />
          </View>
        </AnimatedRN.View>

        <AnimatedRN.View entering={FadeInDown.delay(180).springify().damping(18)} style={styles.section}>
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <SettingRow icon="log-out" label={t("settings.logout")} isDark={isDark} onPress={handleLogout} danger chevron={false} />
            <View style={[styles.rowDivider, { backgroundColor: dividerColor }]} />
            <SettingRow icon="trash-2" label={t("settings.deleteAccount")} isDark={isDark} onPress={handleDeleteAccount} danger chevron={false} />
          </View>
        </AnimatedRN.View>

        <Text style={[styles.version, { color: colors.text.tertiary }]}>Soulie v1.0.0</Text>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, gap: 8 },
  profileCard: { borderRadius: 22, overflow: "hidden", borderWidth: 1, marginBottom: 8 },
  profileGradient: { flexDirection: "row", alignItems: "center", padding: 18, gap: 14 },
  profileAvatar: { width: 58, height: 58, borderRadius: 29, justifyContent: "center", alignItems: "center" },
  profileAvatarPhoto: { width: 58, height: 58, borderRadius: 29 },
  profileInitial: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  profileUsername: { fontSize: 13, fontFamily: "Inter_500Medium" },
  profileStats: { alignItems: "flex-end" },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  vipBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,215,0,0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  vipBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FFD700", letterSpacing: 0.4 },
  levelCard: { borderRadius: 22, overflow: "hidden", borderWidth: 1, marginBottom: 8 },
  levelGradient: { padding: 18, gap: 14 },
  levelTopRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  levelBadge: { width: 50, height: 50, borderRadius: 25, overflow: "hidden" },
  levelBadgeImage: { width: 50, height: 50, borderRadius: 25 },
  levelInfo: { flex: 1, gap: 3 },
  levelTitleRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  levelTitle: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  levelSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  levelXpText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  levelChevronWrapper: {},
  levelBarWrapper: { gap: 6 },
  levelBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  levelBarFill: { height: "100%", borderRadius: 4, overflow: "hidden" },
  levelBarLabels: { flexDirection: "row", justifyContent: "space-between" },
  levelBarLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  section: { gap: 6 },
  sectionHeader: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3, textTransform: "uppercase", paddingHorizontal: 4, marginTop: 8 },
  sectionCard: { borderRadius: 18, overflow: "hidden", borderWidth: 1 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  settingIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  settingIconDanger: { backgroundColor: "rgba(255,59,48,0.08)" },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_400Regular", letterSpacing: -0.1 },
  settingValue: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  rowDivider: { height: 1, marginLeft: 62 },
  version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 12, marginBottom: 8 },
});
