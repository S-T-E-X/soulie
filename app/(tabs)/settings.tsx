import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
  Alert,
  Image,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import { useAuth } from "@/contexts/AuthContext";
import { useChatContext } from "@/contexts/ChatContext";
import Colors from "@/constants/colors";

function SettingRow({
  icon,
  label,
  value,
  onPress,
  danger,
  chevron = true,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
  chevron?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Feather name={icon as any} size={17} color={danger ? "#FF3B30" : Colors.accent} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      </View>
      {chevron ? (
        <Feather name="chevron-right" size={16} color={Colors.text.tertiary} />
      ) : null}
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { conversations } = useChatContext();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Çıkış Yap",
      "Hesabından çıkmak istediğine emin misin?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Çıkış Yap",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <BackgroundGradient>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.profileCard}>
          <LinearGradient colors={["rgba(255,255,255,0.85)", "rgba(255,255,255,0.7)"]} style={styles.profileGradient}>
            <LinearGradient colors={[Colors.userBubble.from, Colors.userBubble.to]} style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>
                {user?.name?.charAt(0).toUpperCase() ?? "L"}
              </Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name ?? "Kullanıcı"}</Text>
              <Text style={styles.profileUsername}>@{user?.username ?? "kullanici"}</Text>
            </View>
            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{conversations.length}</Text>
                <Text style={styles.statLabel}>Sohbet</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify().damping(18)} style={styles.section}>
          <SectionHeader title="Hesap" />
          <View style={styles.sectionCard}>
            <SettingRow
              icon="user"
              label="Profili Düzenle"
              value={user?.name}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="bell"
              label="Bildirimler"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="lock"
              label="Gizlilik"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify().damping(18)} style={styles.section}>
          <SectionHeader title="Premium" />
          <View style={styles.sectionCard}>
            <SettingRow
              icon="star"
              label="Premium'a Geç"
              value="Ücretsiz Plan"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/(tabs)/market");
              }}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="refresh-cw"
              label="Satın Alımları Geri Yükle"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify().damping(18)} style={styles.section}>
          <SectionHeader title="Destek" />
          <View style={styles.sectionCard}>
            <SettingRow
              icon="help-circle"
              label="Yardım Merkezi"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="message-square"
              label="Geri Bildirim"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
            <View style={styles.rowDivider} />
            <SettingRow
              icon="file-text"
              label="Gizlilik Politikası"
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify().damping(18)} style={styles.section}>
          <View style={styles.sectionCard}>
            <SettingRow
              icon="log-out"
              label="Çıkış Yap"
              onPress={handleLogout}
              danger
              chevron={false}
            />
          </View>
        </Animated.View>

        <Text style={styles.version}>Lumina AI v1.0.0</Text>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  profileCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  profileGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  profileInfo: { flex: 1, gap: 3 },
  profileName: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.4,
  },
  profileUsername: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
  },
  profileStats: {
    alignItems: "flex-end",
  },
  statItem: { alignItems: "center" },
  statNumber: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
  section: { gap: 6 },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.tertiary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    paddingHorizontal: 4,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,122,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingIconDanger: {
    backgroundColor: "rgba(255,59,48,0.08)",
  },
  settingContent: { flex: 1 },
  settingLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text.primary,
    letterSpacing: -0.1,
  },
  settingLabelDanger: { color: "#FF3B30" },
  settingValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
    marginLeft: 62,
  },
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
  },
});
