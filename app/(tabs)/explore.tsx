import React, { useEffect, useCallback, useRef } from "react";
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
  ScrollView,
} from "react-native";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import { CharacterCard } from "@/components/explore/CharacterCard";
import { CHARACTERS } from "@/constants/characters";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { getAllStreaks } from "@/hooks/useStreak";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/hooks/useI18n";

type CategoryKey = "all" | "fortune" | "lover" | "friend" | "mentor";
const CATEGORY_KEYS: CategoryKey[] = ["all", "fortune", "lover", "friend", "mentor"];

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
          <LinearGradient colors={[Colors.userBubble.from, Colors.userBubble.to]} style={styles.avatarInner}>
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

function TarotBtn() {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const { t } = useI18n();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const bgColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(107,33,168,0.12)", "rgba(107,33,168,0.28)"],
  });
  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(192,132,252,0.35)", "rgba(192,132,252,0.8)"],
  });

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push("/tarot" as any);
      }}
    >
      <Animated.View style={[styles.tarotBtn, { backgroundColor: bgColor, borderColor }]}>
        <Feather name="eye" size={14} color="#C084FC" />
        <Text style={styles.tarotBtnText}>{t("explore.tarot")}</Text>
      </Animated.View>
    </Pressable>
  );
}

function FalciCategoryBtn({ active, onPress, label }: { active: boolean; onPress: () => void; label: string }) {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const bgColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: active
      ? ["rgba(74,222,128,0.85)", "rgba(34,197,94,1)"]
      : ["rgba(74,222,128,0.12)", "rgba(34,197,94,0.22)"],
  });

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(74,222,128,0.4)", "rgba(74,222,128,0.9)"],
  });

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <Animated.View style={[styles.falciBtn, { backgroundColor: bgColor, borderColor }]}>
        <Feather name="eye" size={13} color={active ? "#fff" : "#16A34A"} />
        <Text style={[styles.falciText, active && styles.falciTextActive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { loadConversations, conversations, getConversationByCharacter } = useChatContext();
  const { isDark, colors } = useTheme();
  const { t } = useI18n();
  const [activeCategory, setActiveCategory] = React.useState<CategoryKey>("all");
  const [streaks, setStreaks] = React.useState<Record<string, number>>({});

  useEffect(() => {
    loadConversations();
    getAllStreaks().then((all) => {
      const map: Record<string, number> = {};
      for (const [id, data] of Object.entries(all)) {
        map[id] = data.streak;
      }
      setStreaks(map);
    });
  }, []);

  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
  const xp = totalMessages * 10 + conversations.length * 5;

  const filtered = activeCategory === "all"
    ? CHARACTERS
    : CHARACTERS.filter((c) => {
        if (activeCategory === "mentor") return c.role === "Yaşam Koçu" || c.role === "Çalışma Arkadaşı";
        if (activeCategory === "fortune") return c.role === "Falcı";
        if (activeCategory === "lover") return c.role === "Sevgili";
        if (activeCategory === "friend") return c.role === "Arkadaş";
        return false;
      });

  const handleCharacterPress = useCallback((characterId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/character/[characterId]", params: { characterId } });
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderItem = ({ item, index }: any) => (
    <AnimatedRN.View
      entering={FadeInDown.delay(index * 60).springify().damping(18)}
      style={styles.cardWrapper}
    >
      <CharacterCard
        character={item}
        onPress={() => handleCharacterPress(item.id)}
        hasChat={!!getConversationByCharacter(item.id)}
        streak={streaks[item.id] ?? 0}
      />
    </AnimatedRN.View>
  );

  return (
    <BackgroundGradient>
      <StatusBar barStyle={colors.statusBar} />

      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { color: colors.text.secondary }]}>
              {t("explore.greeting", { name: user?.name ?? "" })}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t("explore.title")}</Text>
          </View>
          <UserAvatarBadge xp={xp} name={user?.name} profilePhoto={user?.profilePhoto} />
        </View>

        <View style={styles.filtersRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORY_KEYS.map((key) => {
              const label = t(`explore.cat_${key}` as any);
              if (key === "fortune") {
                return (
                  <FalciCategoryBtn
                    key={key}
                    active={activeCategory === key}
                    onPress={() => setActiveCategory(key)}
                    label={label}
                  />
                );
              }
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveCategory(key);
                  }}
                  style={[styles.catBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }, activeCategory === key && styles.catBtnActive]}
                >
                  <Text style={[styles.catText, { color: colors.text.secondary }, activeCategory === key && styles.catTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
            <TarotBtn />
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 100 }]}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.7,
  },
  avatarBadge: { position: "relative" },
  avatarFrame: { width: 46, height: 46, borderRadius: 23, padding: 2.5, justifyContent: "center", alignItems: "center" },
  avatarInner: { width: "100%", height: "100%", borderRadius: 20, justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "#fff" },
  avatarPhoto: { width: "100%", height: "100%", borderRadius: 20, borderWidth: 1.5, borderColor: "#fff" },
  avatarInitial: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff" },
  levelBadge: { position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.accent, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  levelBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  filtersRow: {},
  categoriesScroll: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 20,
  },
  catBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  catBtnActive: { backgroundColor: Colors.accent },
  catText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text.secondary },
  catTextActive: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  falciBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  falciText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#16A34A" },
  falciTextActive: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  tarotBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tarotBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#C084FC",
  },
  grid: { paddingHorizontal: 14, paddingTop: 12 },
  row: { justifyContent: "space-between" },
  cardWrapper: { flex: 1, maxWidth: "50%" },
});
