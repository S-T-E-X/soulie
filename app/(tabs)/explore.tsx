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

// Floating star orb animation
function StarOrb({ x, y, delay, size }: { x: number; y: number; delay: number; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2000 + delay * 300, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2000 + delay * 300, useNativeDriver: true }),
      ])
    );
    setTimeout(() => loop.start(), delay * 200);
    return () => loop.stop();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.9, 0.2] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#E9D5FF",
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

function TarotBanner() {
  const { t } = useI18n();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const eyeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();

    // Eye float
    Animated.loop(
      Animated.sequence([
        Animated.timing(eyeAnim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(eyeAnim, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    ).start();

    // Shimmer sweep
    Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1100, useNativeDriver: false }),
        Animated.delay(2000),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(192,132,252,0.4)", "rgba(232,180,255,0.95)"],
  });
  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });
  const eyeY = eyeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const shimmerX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-80, 400] });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
    router.push("/tarot" as any);
  };

  return (
    <Pressable onPress={handlePress} style={{ marginHorizontal: 14, marginTop: 14, marginBottom: 6 }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Animated.View style={[styles.tarotBanner, { borderColor, shadowOpacity, shadowRadius: 16, elevation: 8 }]}>
          <LinearGradient
            colors={["#2D0654", "#4C0D9E", "#1A003C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Ambient purple orb bg */}
          <View style={styles.tarotOrbBig} />

          {/* Floating stars */}
          <StarOrb x={18} y={12} delay={0} size={5} />
          <StarOrb x={52} y={30} delay={1} size={3} />
          <StarOrb x={88} y={10} delay={2} size={4} />
          <StarOrb x={130} y={28} delay={3} size={3} />
          <StarOrb x={260} y={14} delay={1} size={4} />
          <StarOrb x={290} y={32} delay={2} size={3} />
          <StarOrb x={320} y={10} delay={0} size={5} />

          {/* Shimmer sweep */}
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerX }, { rotate: "20deg" }] },
            ]}
          />

          {/* Content */}
          <View style={styles.tarotContent}>
            {/* Eye icon with glow ring */}
            <Animated.View style={[styles.tarotEyeWrap, { transform: [{ translateY: eyeY }] }]}>
              <LinearGradient colors={["#9333EA", "#C084FC"]} style={styles.tarotEyeGrad}>
                <Feather name="eye" size={22} color="#fff" />
              </LinearGradient>
            </Animated.View>

            {/* Text */}
            <View style={styles.tarotTextCol}>
              <Text style={styles.tarotBannerTitle}>{t("explore.tarot")}</Text>
              <Text style={styles.tarotBannerSub}>{t("explore.tarotSubtitle")}</Text>
            </View>

            {/* Arrow */}
            <View style={styles.tarotArrowWrap}>
              <Feather name="chevron-right" size={18} color="rgba(232,180,255,0.7)" />
            </View>
          </View>

          {/* Bottom shimmer line */}
          <View style={styles.tarotBottomLine} />
        </Animated.View>
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
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        ListHeaderComponent={<TarotBanner />}
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

  // Tarot banner
  tarotBanner: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
    height: 80,
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 4 },
  },
  tarotOrbBig: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(139,92,246,0.18)",
    top: -40,
    right: 60,
  },
  shimmer: {
    position: "absolute",
    top: -20,
    left: 0,
    width: 60,
    height: 200,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
  },
  tarotContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 14,
  },
  tarotEyeWrap: {
    shadowColor: "#C084FC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 6,
  },
  tarotEyeGrad: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  tarotTextCol: {
    flex: 1,
    gap: 3,
  },
  tarotBannerTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#F3E8FF",
    letterSpacing: -0.3,
  },
  tarotBannerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(216,180,254,0.7)",
  },
  tarotArrowWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(192,132,252,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  tarotBottomLine: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: "rgba(192,132,252,0.2)",
  },

  grid: { paddingHorizontal: 14, paddingTop: 4 },
  row: { justifyContent: "space-between" },
  cardWrapper: { flex: 1, maxWidth: "50%" },
});
