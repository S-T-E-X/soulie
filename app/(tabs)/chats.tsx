import React, { useEffect, useRef, useState, useCallback } from "react";
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
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from "react-native";
import AnimatedRN, { FadeInDown, FadeIn } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";

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
import { getMutedChars, muteChar, unmuteChar } from "@/lib/mutedChars";

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

const DEFAULT_AVATAR_CHATS = require("@/assets/default_pp/default-avatar-profile.png");

function UserAvatarBadge({ xp, name, profilePhoto }: { xp: number; name?: string; profilePhoto?: string }) {
  const level = getUserLevel(xp);
  const frameColors = getLevelFrameColors(level);
  const avatarSource = profilePhoto ? { uri: profilePhoto } : DEFAULT_AVATAR_CHATS;

  return (
    <Pressable
      onPress={() => router.push("/profile" as any)}
      style={({ pressed }) => [styles.avatarBadge, pressed && { opacity: 0.8 }]}
      hitSlop={6}
    >
      <LinearGradient colors={frameColors} style={styles.avatarFrame}>
        <Image source={avatarSource} style={styles.avatarPhoto} />
      </LinearGradient>
      <View style={styles.levelBadge}>
        <Text style={styles.levelBadgeText}>{level}</Text>
      </View>
    </Pressable>
  );
}

function ChatRow({
  conversation,
  index,
  streak = 0,
  isMuted,
  onLongPress,
}: {
  conversation: Conversation;
  index: number;
  streak?: number;
  isMuted: boolean;
  onLongPress: () => void;
}) {
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
          onLongPress();
        }}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.chatRow,
          character.id === "sibel" && { backgroundColor: "rgba(107,33,168,0.07)", borderLeftWidth: 3, borderLeftColor: "#7C3AED" },
          pressed && { opacity: 0.75 },
        ]}
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
          {isMuted && (
            <View style={styles.mutedBadge}>
              <Feather name="bell-off" size={8} color="#fff" />
            </View>
          )}
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
              {isMuted && (
                <View style={styles.mutedPill}>
                  <Feather name="bell-off" size={9} color="#8E8E93" />
                  <Text style={styles.mutedPillText}>Sessiz</Text>
                </View>
              )}
            </View>
            <Text style={[styles.time, { color: colors.text.tertiary }]}>{timeAgo()}</Text>
          </View>
          <View style={styles.chatBottom}>
            <Text style={[styles.lastMsg, { color: isMuted ? colors.text.tertiary : colors.text.secondary }]} numberOfLines={1}>
              {conversation.lastMessage || t("chats.chatStarted", { name: character.name })}
            </Text>
            <View style={[styles.rolePill, { backgroundColor: character.id === "sibel" ? "rgba(107,33,168,0.15)" : colors.surface }]}>
              <Text style={[styles.roleLabel, { color: character.id === "sibel" ? "#A855F7" : colors.text.tertiary }]}>{t(character.shortRoleKey as any)}</Text>
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

// ─── Dropdown Menu ────────────────────────────────────────────────────────────
function ConversationMenu({
  conv,
  isMuted,
  isDark,
  colors,
  onMuteToggle,
  onDelete,
  onClose,
}: {
  conv: Conversation;
  isMuted: boolean;
  isDark: boolean;
  colors: any;
  onMuteToggle: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const character = getCharacter(conv.characterId);

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <AnimatedRN.View entering={FadeIn.duration(150)} style={StyleSheet.absoluteFill}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.menuOverlay} />
        </TouchableWithoutFeedback>

        <AnimatedRN.View
          entering={FadeInDown.duration(220).springify().damping(20)}
          style={[
            styles.menuSheet,
            {
              backgroundColor: isDark ? "rgba(30,30,32,0.97)" : "rgba(255,255,255,0.97)",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          {/* Karakter başlığı */}
          <View style={styles.menuHeader}>
            {character?.image ? (
              <Image source={character.image} style={styles.menuAvatar} />
            ) : (
              <LinearGradient colors={character?.gradientColors ?? ["#555", "#333"]} style={styles.menuAvatar}>
                <Feather name="eye" size={14} color="#fff" />
              </LinearGradient>
            )}
            <Text style={[styles.menuTitle, { color: colors.text.primary }]}>{character?.name}</Text>
          </View>

          <View style={[styles.menuDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]} />

          {/* Sessize Al / Sesi Aç */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onMuteToggle();
            }}
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
          >
            <View style={[styles.menuIconBg, { backgroundColor: isDark ? "rgba(142,142,147,0.15)" : "rgba(142,142,147,0.1)" }]}>
              <Feather name={isMuted ? "bell" : "bell-off"} size={18} color="#8E8E93" />
            </View>
            <View style={styles.menuItemText}>
              <Text style={[styles.menuItemLabel, { color: colors.text.primary }]}>
                {isMuted ? "Sesi Aç" : "Sessize Al"}
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.text.tertiary }]}>
                {isMuted ? "Bildirimler tekrar gelsin" : "Bu karakterden bildirim gelmesin"}
              </Text>
            </View>
            {isMuted && (
              <Feather name="check" size={16} color={Colors.accent} />
            )}
          </Pressable>

          <View style={[styles.menuDivider, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]} />

          {/* Sohbeti Sil */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onDelete();
            }}
            style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
          >
            <View style={[styles.menuIconBg, { backgroundColor: "rgba(255,59,48,0.1)" }]}>
              <Feather name="trash-2" size={18} color="#FF3B30" />
            </View>
            <View style={styles.menuItemText}>
              <Text style={[styles.menuItemLabel, { color: "#FF3B30" }]}>Sohbeti Sil</Text>
              <Text style={[styles.menuItemSub, { color: colors.text.tertiary }]}>Tüm mesajlar silinir</Text>
            </View>
          </Pressable>
        </AnimatedRN.View>
      </AnimatedRN.View>
    </Modal>
  );
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { conversations, isLoaded, loadConversations, deleteConversation } = useChatContext();
  const { isDark, colors } = useTheme();
  const { t } = useI18n();
  const [showMissions, setShowMissions] = useState(false);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [menuConv, setMenuConv] = useState<Conversation | null>(null);
  const [mutedChars, setMutedChars] = useState<string[]>([]);

  useEffect(() => {
    loadConversations();
    getAllStreaks().then((all) => {
      const map: Record<string, number> = {};
      for (const [id, data] of Object.entries(all)) map[id] = data.streak;
      setStreaks(map);
    });
    getMutedChars().then(setMutedChars);
  }, []);

  const handleMuteToggle = useCallback(async (charId: string) => {
    if (mutedChars.includes(charId)) {
      await unmuteChar(charId);
      setMutedChars((prev) => prev.filter((id) => id !== charId));
    } else {
      await muteChar(charId);
      // Mevcut scheduled bildirimleri iptal et (sadece native'de çalışır)
      if (Platform.OS !== "web") {
        const all = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of all) {
          if (n.content.data?.characterId === charId && !n.content.data?.isContext) {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
          }
        }
      }
      setMutedChars((prev) => [...prev, charId]);
    }
    setMenuConv(null);
  }, [mutedChars]);

  const handleDelete = useCallback((conv: Conversation) => {
    setMenuConv(null);
    Alert.alert(
      getCharacter(conv.characterId)?.name ?? "Sohbet",
      "Bu sohbet kalıcı olarak silinecek. Emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => deleteConversation(conv.id),
        },
      ]
    );
  }, [deleteConversation]);

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
            isMuted={mutedChars.includes(item.characterId)}
            onLongPress={() => setMenuConv(item)}
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

      {/* Dropdown menu modal */}
      {menuConv && (
        <ConversationMenu
          conv={menuConv}
          isMuted={mutedChars.includes(menuConv.characterId)}
          isDark={isDark}
          colors={colors}
          onMuteToggle={() => handleMuteToggle(menuConv.characterId)}
          onDelete={() => handleDelete(menuConv)}
          onClose={() => setMenuConv(null)}
        />
      )}
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
  avatarPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#fff",
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
  mutedBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#8E8E93",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
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
    flex: 1,
  },
  charName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
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
  mutedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(142,142,147,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mutedPillText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#8E8E93",
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
  // ─── Dropdown menu ───────────────────────────────────────────────────────────
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  menuSheet: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 40,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#555",
  },
  menuTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.3,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 0,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  menuIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemText: {
    flex: 1,
    gap: 2,
  },
  menuItemLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    letterSpacing: -0.2,
  },
  menuItemSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
