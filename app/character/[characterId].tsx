import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  FadeInDown,
} from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { getCharacter } from "@/constants/characters";
import { useCharacterSettings } from "@/hooks/useCharacterSettings";
import { useAutoMessages } from "@/hooks/useAutoMessages";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { CharacterCustomizeSheet } from "@/components/chat/CharacterCustomizeSheet";
import { t } from "@/lib/i18n";
import Colors from "@/constants/colors";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const PHOTO_HEIGHT = SCREEN_H * 0.62;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function CharacterProfileScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacter(characterId);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const lang = user?.language ?? "tr";
  const scrollY = useSharedValue(0);
  const [showCustomize, setShowCustomize] = useState(false);
  const { settings, isLoaded: settingsLoaded, updateSettings, removeMemory } = useCharacterSettings(characterId ?? "");
  const { getConversationByCharacter } = useChatContext();
  const conversation = getConversationByCharacter(characterId ?? "");
  const userMessageCount = conversation?.messages.filter(m => m.role === "user").length ?? 0;

  useAutoMessages(character, settings, settingsLoaded, userMessageCount);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const photoAnimStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-80, 0], [1.12, 1], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 200], [0, -50], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }] };
  });

  const headerOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [PHOTO_HEIGHT - 120, PHOTO_HEIGHT - 50],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!character) {
    return (
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={[styles.closeBtn, { top: topPad + 12 }]}>
          <Feather name="x" size={18} color="#fff" />
        </Pressable>
      </View>
    );
  }

  const handleStartChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (character.isPremium) {
      router.back();
      setTimeout(() => router.push("/(tabs)/market"), 50);
      return;
    }
    router.back();
    setTimeout(() => {
      router.push({ pathname: "/chat/[id]", params: { characterId: character.id, id: character.id } });
    }, 50);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Animated.View style={[styles.stickyHeader, { paddingTop: topPad }, headerOpacityStyle]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.9)" }]} />
        )}
        <View style={styles.stickyHeaderContent}>
          <Pressable onPress={() => router.back()} style={styles.stickyBack} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={Colors.text.primary} />
          </Pressable>
          <Text style={[styles.stickyTitle, { color: Colors.text.primary }]}>{character.name}</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCustomize(true);
            }}
            style={styles.stickyBack}
            hitSlop={8}
          >
            <Feather name="sliders" size={19} color={Colors.text.secondary} />
          </Pressable>
        </View>
      </Animated.View>

      <Pressable
        onPress={() => router.back()}
        style={[styles.closeBtn, { top: topPad + 12 }]}
        hitSlop={8}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Feather name="chevron-down" size={20} color="#fff" />
      </Pressable>

      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowCustomize(true);
        }}
        style={[styles.settingsBtn, { top: topPad + 12 }]}
        hitSlop={8}
      >
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Feather name="sliders" size={18} color="#fff" />
      </Pressable>

      <AnimatedScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <View style={{ height: PHOTO_HEIGHT }}>
          <Animated.View style={[{ height: PHOTO_HEIGHT, overflow: "hidden" }, photoAnimStyle]}>
            <Image
              source={character.image}
              style={styles.photo}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.92)"]}
              locations={[0.3, 0.55, 0.78, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          <View style={styles.photoOverlayContent}>
            {character.isPremium ? (
              <Animated.View entering={FadeInDown.delay(100)} style={styles.premiumChip}>
                <Feather name="star" size={11} color="#FFD700" />
                <Text style={styles.premiumChipText}>Premium</Text>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeInDown.delay(150)} style={styles.nameRow}>
              <Text style={styles.nameText}>{character.name}</Text>
              <Text style={styles.ageText}>{character.age}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200)} style={styles.roleRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{character.shortRole}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250)} style={styles.tagsRow}>
              {character.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={styles.infoSheet}>
          <View style={styles.sheetHandle} />

          <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <Feather name="user" size={16} color={Colors.accent} />
              <Text style={styles.infoTitle}>{t("char_about", lang)}</Text>
            </View>
            <Text style={styles.descText}>{character.description}</Text>
          </Animated.View>

          <View style={styles.divider} />

          <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <Feather name="heart" size={16} color={Colors.accent} />
              <Text style={styles.infoTitle}>{t("char_interests", lang)}</Text>
            </View>
            <View style={styles.interestGrid}>
              {character.tags.map((tag) => (
                <View key={tag} style={styles.interestChip}>
                  <Text style={styles.interestChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <View style={styles.divider} />

          <Animated.View entering={FadeInDown.delay(160).springify().damping(18)} style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <Feather name="info" size={16} color={Colors.accent} />
              <Text style={styles.infoTitle}>{t("char_profile", lang)}</Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{character.age}</Text>
                <Text style={styles.statLabel}>{t("char_age", lang)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{character.gender === "female" ? t("char_female", lang) : t("char_male", lang)}</Text>
                <Text style={styles.statLabel}>{t("char_gender_label", lang)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{t("char_ai_type", lang)}</Text>
                <Text style={styles.statLabel}>{t("char_type", lang)}</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify().damping(18)} style={styles.ctaSection}>
            <Pressable
              onPress={handleStartChat}
              style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient
                colors={character.isPremium
                  ? ["#FFD700", "#FF9500"]
                  : [Colors.userBubble.from, Colors.userBubble.to]}
                style={styles.ctaGradient}
              >
                <Feather name={character.isPremium ? "star" : "message-circle"} size={18} color="#fff" />
                <Text style={styles.ctaText}>
                  {character.isPremium ? t("char_premium_required", lang) : t("char_start_chat", lang)}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </AnimatedScrollView>

      <CharacterCustomizeSheet
        visible={showCustomize}
        onClose={() => setShowCustomize(false)}
        characterName={character.name}
        settings={settings}
        isVip={settings.isPremium}
        onSave={(partial) => updateSettings(partial)}
        onRemoveMemory={removeMemory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: "hidden",
    paddingBottom: 12,
  },
  stickyHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  stickyBack: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  stickyTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  closeBtn: {
    position: "absolute",
    left: 16,
    zIndex: 200,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  settingsBtn: {
    position: "absolute",
    right: 16,
    zIndex: 200,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  photo: {
    width: SCREEN_W,
    height: PHOTO_HEIGHT,
  },
  photoOverlayContent: {
    position: "absolute",
    bottom: 52,
    left: 20,
    right: 20,
    gap: 8,
  },
  premiumChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,214,0,0.4)",
  },
  premiumChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFD700",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
  },
  nameText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -1,
  },
  ageText: {
    fontSize: 24,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: -0.5,
  },
  roleRow: { flexDirection: "row" },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  roleText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#fff",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  infoSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    paddingTop: 6,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  infoSection: {
    padding: 20,
    gap: 10,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  descText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginHorizontal: 20,
  },
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestChip: {
    backgroundColor: "rgba(0,122,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,122,255,0.15)",
  },
  interestChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 4,
  },
  ctaSection: {
    padding: 20,
    paddingTop: 8,
  },
  ctaButton: {
    borderRadius: 18,
    overflow: "hidden",
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: -0.3,
  },
});
