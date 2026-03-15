import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  StatusBar,
  Image,
  Animated,
  Alert,
} from "react-native";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import { WeeklyMissionsSheet } from "@/components/WeeklyMissionsSheet";
import { useChatContext, type Conversation } from "@/contexts/ChatContext";
import { getCharacter } from "@/constants/characters";
import { useAuth } from "@/contexts/AuthContext";
import { getAllStreaks } from "@/hooks/useStreak";
import { useWeeklyMissions } from "@/hooks/useWeeklyMissions";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/hooks/useI18n";

const LEVEL_XP_TABLE = [0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750];

function getUserLevel(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_XP_TABLE.length - 1; i++) {
    if (xp >= LEVEL_XP_TABLE[i + 1]) level = i + 2;
    else break;
  }
  return Math.min(level, 10);
}

function getLevelFrameColors(level: number): [string, string] {
  if (level <= 2) return ["#8E8E93", "#636366"];
  if (level <= 4) return [Colors.userBubble.from, Colors.userBubble.to];
  if (level <= 6) return ["#5856D6", "#AF52DE"];
  if (level <= 8) return ["#FF9500", "#FF6B00"];
  return ["#FFD700", "#FFB800"];
}

function UserAvatarBadge({ xp, name, profilePhoto }: { xp: number; name?: string; profilePhoto?: string }) {
  const level = getUserLevel(xp);
  const frameColors = getLevelFrameColors(level);
  const initial = name?.charAt(0).toUpperCase() ?? "S";

  return (
    <Pressable
      onPress={() => router.push("/profile" as any)}
      style={({ pressed }) => [styles.avatarBadge, pressed && { opacity: 0.8 }]}
      hitSlop={6}
    >
      <LinearGradient colors={frameColors} style={styles.avatarFrame}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto }} style={styles.avatarPhoto} />
        ) : (
          <LinearGradient
            colors={[Colors.userBubble.from, Colors.userBubble.to]}
            style={styles.avatarInner}
          >
            <Text style={styles.avatarInitial}>{initial}</Text>
          </LinearGradient>
        )}
      </LinearGradient>
      <View style={styles.levelBadge}>
        <Text style={styles.levelBadgeText}>{level}</Text>
      </View>
    </Pressable>
  );
}

function ChatRow({ conversation, index, streak = 0, onDelete }: { conversation: Conversation; index: number; streak?: number; onDelete: () => void }) {
  const character = getCharacter(conversation.characterId);
  const { colors } = useTheme();
  const { t } = useI18n();
  if (!character) return null;

  const timeAgo = () => {
    const diff = Date.now() - conversation.updatedAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("chats.justNow");
    if (mins < 60) return `${mins}${t("chats.min")}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}${t("chats.hour")}`;
    return `${Math.floor(hours / 24)}${t("chats.day")}`;
  };

  return (
    <AnimatedRN.View entering={FadeInDown.delay(index * 50).springify().damping(18)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/chat/[id]", params: { id: conversation.id, characterId: conversation.characterId } });
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          Alert.alert(
            t("chats.chatWith", { name: character.name }),
            t("chats.deleteConfirm"),
            [
              { text: t("common.cancel"), style: "cancel" },
              { text: t("common.delete"), style: "destructive", onPress: onDelete },
            ]
          );
        }}
        delayLongPress={450}
        style={({ pressed }) => [styles.chatRow, pressed && { opacity: 0.75 }]}
      >
        <View style={styles.avatarContainer}>
          {character.image ? (
            <Image source={character.image} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={character.gradientColors}
              style={[styles.avatar, { justifyContent: "center", alignItems: "center" }]}
            >
              <Feather name="eye" size={20} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          )}
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatTop}>
            <View style={styles.nameRow}>
              <Text style={[styles.charName, { color: colors.text.primary }]}>{character.name}</Text>
              {streak >= 2 ? (
                <View style={styles.streakPill}>
                  <Feather name="zap" size={9} color="#FF9500" />
                  <Text style={styles.streakCount}>{streak}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.time, { color: colors.text.tertiary }]}>{timeAgo()}</Text>
          </View>
          <View style={styles.chatBottom}>
            <Text style={[styles.lastMsg, { color: colors.text.secondary }]} numberOfLines={1}>
              {conversation.lastMessage || t("chats.chatStarted", { name: character.name })}
            </Text>
            <View style={[styles.rolePill, { backgroundColor: colors.surface }]}>
              <Text style={[styles.roleLabel, { color: colors.text.tertiary }]}>{character.shortRole}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </AnimatedRN.View>
  );
}

function EmptyState() {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.empty}>
      <LinearGradient
        colors={["rgba(0,122,255,0.10)", "rgba(0,122,255,0.03)"]}
        style={styles.emptyIcon}
      >
        <Feather name="message-circle" size={28} color={colors.accent} />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>{t("chats.empty")}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
        {t("chats.emptySubtitle")}
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/explore")}
        style={styles.emptyButton}
      >
        <LinearGradient
          colors={[Colors.userBubble.from, Colors.userBubble.to]}
          style={styles.emptyButtonGrad}
        >
          <Text style={styles.emptyButtonText}>{t("chats.goExplore")}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function MissionsBanner({
  completedCount,
  totalMissions,
  onPress,
  bottom,
}: {
  completedCount: number;
  totalMissions: number;
  onPress: () => void;
  bottom: number;
}) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const { t } = useI18n();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] });
  const allDone = completedCount === totalMissions;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.missionsBanner, { bottom }]}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: allDone ? "#FFD700" : Colors.accent, borderRadius: 18, opacity: glowOpacity }]}
      />
      <LinearGradient
        colors={allDone ? ["rgba(255,215,0,0.15)", "rgba(255,186,0,0.08)"] : ["rgba(0,122,255,0.1)", "rgba(0,122,255,0.04)"]}
        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
      />
      <View style={styles.missionsBannerLeft}>
        <LinearGradient
          colors={allDone ? ["#FFD700", "#FFB800"] : [Colors.userBubble.from, Colors.userBubble.to]}
          style={styles.missionsBannerIcon}
        >
          <Feather name={allDone ? "award" : "target"} size={16} color="#fff" />
        </LinearGradient>
        <View>
          <Text style={styles.missionsBannerTitle}>{t("chats.weeklyMissions")}</Text>
          <Text style={styles.missionsBannerSub}>
            {allDone ? t("chats.allDone") : t("chats.missionsProgress", { completed: completedCount, total: totalMissions })}
          </Text>
        </View>
      </View>
      <View style={styles.missionsBannerRight}>
        <View style={styles.dotsRow}>
          {Array.from({ length: totalMissions }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < completedCount && (allDone ? styles.dotGold : styles.dotDone),
              ]}
            />
          ))}
        </View>
        <Feather name="chevron-right" size={14} color={Colors.text.tertiary} />
      </View>
    </Pressable>
  );
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, isLoaded, loadConversations, deleteConversation } = useChatContext();
  const { isDark, colors } = useTheme();
  const { t } = useI18n();
  const [showMissions, setShowMissions] = React.useState(false);
  const [streaks, setStreaks] = React.useState<Record<string, number>>({});

  useEffect(() => {
    loadConversations();
    getAllStreaks().then((all) => {
      const map: Record<string, number> = {};
      for (const [id, data] of Object.entries(all)) map[id] = data.streak;
      setStreaks(map);
    });
  }, []);

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
  const xp = totalMessages * 10 + conversations.length * 5;

  const now = Date.now();
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;
  const weekUserMessages = conversations.flatMap((c) =>
    c.messages.filter((m) => m.timestamp >= weekStart && m.role === "user")
  );
  const differentCharactersThisWeek = new Set(
    conversations
      .filter((c) => c.messages.some((m) => m.timestamp >= weekStart && m.role === "user"))
      .map((c) => c.characterId)
  ).size;
  const chatDaysThisWeek = new Set(
    weekUserMessages.map((m) => new Date(m.timestamp).toISOString().split("T")[0])
  ).size;
  const maxStreakThisWeek = Math.max(0, ...Object.values(streaks));

  const { missions, getMissionProgress, completedCount, totalMissions, claimReward } =
    useWeeklyMissions({
      totalMessagesSentThisWeek: weekUserMessages.length,
      differentCharactersThisWeek,
      chatDaysThisWeek,
      maxStreakThisWeek,
    });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const tabBarH = Platform.OS === "web" ? 84 : 83 + insets.bottom;
  const bannerBottom = Platform.OS === "web" ? 34 + 84 + 10 : insets.bottom + 83 + 10;

  return (
    <BackgroundGradient>
      <StatusBar barStyle={colors.statusBar} />

      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t("chats.title")}</Text>
            <Text style={[styles.headerSub, { color: colors.text.secondary }]}>{t("chats.activeCount", { count: sorted.length })}</Text>
          </View>
          <UserAvatarBadge xp={xp} name={user?.name} profilePhoto={user?.profilePhoto} />
        </View>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ChatRow
            conversation={item}
            index={index}
            streak={streaks[item.characterId] ?? 0}
            onDelete={() => deleteConversation(item.id)}
          />
        )}
        ListEmptyComponent={isLoaded ? <EmptyState /> : null}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarH + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {missions.length > 0 ? (
        <MissionsBanner
          completedCount={completedCount}
          totalMissions={totalMissions}
          onPress={() => setShowMissions(true)}
          bottom={bannerBottom}
        />
      ) : null}

      <WeeklyMissionsSheet
        visible={showMissions}
        onClose={() => setShowMissions(false)}
        missions={missions}
        getMissionProgress={getMissionProgress}
        completedCount={completedCount}
        totalMissions={totalMissions}
        language={user?.language ?? "tr"}
        claimReward={claimReward}
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    marginTop: 2,
  },
  avatarBadge: {
    position: "relative",
  },
  avatarFrame: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  avatarPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  avatarInitial: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  levelBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  levelBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  list: {
    paddingTop: 8,
    flexGrow: 1,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: "transparent",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E5E5EA",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  chatInfo: {
    flex: 1,
    gap: 5,
  },
  chatTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  charName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: -0.2,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,149,0,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  streakCount: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#FF9500",
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
  chatBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  lastMsg: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    letterSpacing: -0.1,
  },
  rolePill: {
    backgroundColor: "rgba(0,122,255,0.08)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.04)",
    marginLeft: 86,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 21,
  },
  emptyButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  emptyButtonGrad: {
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  emptyButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  missionsBanner: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,122,255,0.12)",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    overflow: "hidden",
  },
  missionsBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  missionsBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  missionsBannerTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  missionsBannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    marginTop: 1,
  },
  missionsBannerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  dotDone: {
    backgroundColor: Colors.accent,
  },
  dotGold: {
    backgroundColor: "#FFD700",
  },
});
