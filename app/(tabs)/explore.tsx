import React, { useEffect, useCallback, useRef, useState } from "react";
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
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import { logEvent } from "@/lib/analytics";
import { CharacterCard } from "@/components/explore/CharacterCard";
import { CHARACTERS } from "@/constants/characters";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomChars } from "@/contexts/CustomCharContext";
import { getAllStreaks } from "@/hooks/useStreak";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/hooks/useI18n";

type CategoryKey = "all" | "female" | "male" | "fortune";

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

const DEFAULT_AVATAR_EXPLORE = require("@/assets/default_pp/default-avatar-profile.png");

function UserAvatarBadge({ xp, name, profilePhoto }: { xp: number; name?: string; profilePhoto?: string }) {
  const level = getUserLevel(xp);
  const frameColors = getLevelFrameColors(level);
  const initial = name?.charAt(0).toUpperCase() ?? "S";
  const avatarSource = profilePhoto ? { uri: profilePhoto } : DEFAULT_AVATAR_EXPLORE;

  return (
    <Pressable
      onPress={() => router.push("/profile" as any)}
      style={({ pressed }) => [styles.avatarBadge, pressed && { opacity: 0.8 }]}
      hitSlop={6}
    >
      <LinearGradient colors={frameColors} style={styles.avatarFrame}>
        {profilePhoto ? (
          <Image source={avatarSource} style={styles.avatarPhoto} />
        ) : (
          <Image source={DEFAULT_AVATAR_EXPLORE} style={styles.avatarPhoto} />
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
    <Pressable onPress={handlePress} style={{ marginHorizontal: 14, marginTop: 10, marginBottom: 3 }}>
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
                <Feather name="eye" size={14} color="#fff" />
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

function CoffeeFortuneBanner() {
  const { t } = useI18n();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/chat/[id]", params: { id: "new", characterId: "sibel" } } as any);
  };

  return (
    <Pressable onPress={handlePress} style={styles.coffeeBanner}>
      <LinearGradient
        colors={["#3D1A00", "#7C3A00", "#3D1A00"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.coffeeBannerGrad}
      >
        <LinearGradient colors={["#C67C3C", "#8B4513"]} style={styles.coffeeIcon}>
          <Feather name="coffee" size={18} color="#fff" />
        </LinearGradient>
        <View style={styles.coffeeTextCol}>
          <Text style={styles.coffeeBannerTitle}>{t("explore.coffeeFortune")}</Text>
          <Text style={styles.coffeeBannerSub}>{t("explore.coffeeFortuneSubtitle")}</Text>
        </View>
        <Feather name="chevron-right" size={16} color="rgba(255,200,150,0.7)" />
      </LinearGradient>
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

const CUSTOM_GRADIENTS: [string, string][] = [
  ["#FF6B9D", "#C44BAB"],
  ["#4FC3F7", "#1565C0"],
  ["#81C784", "#388E3C"],
  ["#FFB74D", "#E65100"],
  ["#CE93D8", "#7B1FA2"],
  ["#4DD0E1", "#00838F"],
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { user, isVipActive } = useAuth();
  const { loadConversations, conversations, getConversationByCharacter } = useChatContext();
  const { isDark, colors } = useTheme();
  const { t } = useI18n();
  const { customChars, addCustomChar, removeCustomChar } = useCustomChars();
  const [activeCategory, setActiveCategory] = React.useState<CategoryKey>("all");
  const [streaks, setStreaks] = React.useState<Record<string, number>>({});
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showVipPopup, setShowVipPopup] = useState(false);

  const [formName, setFormName] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [formGender, setFormGender] = useState<"female" | "male" | "non-binary">("female");
  const [formCreating, setFormCreating] = useState(false);

  useEffect(() => {
    if (user?.id) logEvent(user.id, "screen_view", "explore");
  }, [user?.id]);

  useEffect(() => {
    loadConversations();
    getAllStreaks().then((all) => {
      const map: Record<string, number> = {};
      for (const [id, data] of Object.entries(all)) {
        map[id] = data.streak;
      }
      setStreaks(map);
    });
    // Preload character images for faster rendering
    CHARACTERS.forEach((char) => {
      if (char.image && typeof char.image === "object" && "uri" in char.image) {
        Image.prefetch(char.image.uri);
      }
    });
  }, []);

  const myCustomChars = user ? customChars.filter((c) => c.ownerId === user.id) : [];

  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
  const xp = totalMessages * 10 + conversations.length * 5;

  const allChars = activeCategory === "all"
    ? [...CHARACTERS, ...myCustomChars]
    : CHARACTERS.filter((c) => {
        if (activeCategory === "female") return c.gender === "female";
        if (activeCategory === "male") return c.gender === "male";
        if (activeCategory === "fortune") return c.role === "Falcı";
        return true;
      });

  const handleCharacterPress = useCallback((characterId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/character/[characterId]", params: { characterId } });
  }, []);

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isVipActive) {
      setShowVipPopup(true);
      return;
    }
    setFormName("");
    setFormAge("");
    setFormDesc("");
    setFormPhoto(null);
    setFormGender("female");
    setShowCreateSheet(true);
  };

  const handlePickPhoto = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setFormPhoto(result.assets[0].uri);
    }
  };

  const handleCreateChar = async () => {
    if (!formName.trim() || !formDesc.trim()) {
      Alert.alert(t("explore.customError"));
      return;
    }
    if (!user) return;
    setFormCreating(true);
    const gradIdx = myCustomChars.length % CUSTOM_GRADIENTS.length;
    await addCustomChar({
      name: formName.trim(),
      age: parseInt(formAge) || 25,
      description: formDesc.trim(),
      role: "Özel Karakter",
      shortRole: formName.trim(),
      shortRoleKey: "char.role.artist",
      systemPrompt: `Sen ${formName.trim()}'sın. ${formDesc.trim()} Bu kişiliği yansıtarak kullanıcıyla samimi, gerçekçi ve ilgi çekici bir şekilde sohbet et.`,
      image: formPhoto ? { uri: formPhoto } : null,
      noImage: !formPhoto,
      tags: [],
      gender: formGender,
      isPremium: false,
      gradientColors: CUSTOM_GRADIENTS[gradIdx],
      isCustom: true,
      ownerId: user.id,
    });
    setFormCreating(false);
    setShowCreateSheet(false);
    Alert.alert(t("explore.customSuccess"), t("explore.customSuccessMsg"));
  };

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
            <View style={styles.aiCompanionBadge}>
              <Feather name="cpu" size={10} color="#7C3AED" />
              <Text style={styles.aiCompanionLabel}>AI Companion</Text>
            </View>
          </View>
          <UserAvatarBadge xp={xp} name={user?.name} profilePhoto={user?.profilePhoto} />
        </View>

        <View style={styles.filtersRow}>
          <View style={styles.filterBtnRow}>
            {(["all", "female", "male", "fortune"] as CategoryKey[]).map((key) => {
              const label = key === "all" ? t("explore.cat_all" as any) : key === "female" ? t("explore.cat_female" as any) : key === "male" ? t("explore.cat_male" as any) : t("explore.cat_fortune" as any);
              const isActive = activeCategory === key;
              const isFortune = key === "fortune";
              
              if (isFortune) {
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveCategory(key);
                    }}
                    style={[styles.fortuneBtn, isActive && styles.fortuneBtnActive]}
                  >
                    <Feather name="eye" size={13} color={isActive ? "#fff" : "#16A34A"} />
                    <Text style={[styles.fortuneBtnText, isActive && styles.fortuneBtnTextActive]}>{label}</Text>
                  </Pressable>
                );
              }

              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveCategory(key);
                  }}
                  style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                >
                  {isActive ? (
                    <LinearGradient colors={["#7C3AED", "#A855F7"]} style={StyleSheet.absoluteFill} />
                  ) : null}
                  <Text style={[styles.filterBtnText, isActive && styles.filterBtnTextActive]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <FlatList
        data={allChars}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        ListHeaderComponent={activeCategory === "fortune" ? <><TarotBanner /><CoffeeFortuneBanner /></> : undefined}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 120 }]}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />

      <Pressable
        onPress={handleFabPress}
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
      >
        <LinearGradient colors={["#7C3AED", "#A855F7"]} style={styles.fabGradient}>
          <Feather name="plus" size={26} color="#fff" />
        </LinearGradient>
      </Pressable>

      <Modal
        visible={showVipPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVipPopup(false)}
      >
        <Pressable style={styles.vipOverlay} onPress={() => setShowVipPopup(false)}>
          <View style={[styles.vipSheet, { backgroundColor: isDark ? "#1C1C2E" : "#F2F2F7", paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <LinearGradient colors={["rgba(255,214,0,0.15)", "rgba(255,149,0,0.08)"]} style={styles.vipIconBg}>
              <Feather name="star" size={36} color="#FFD700" />
            </LinearGradient>
            <Text style={[styles.vipPopupTitle, { color: isDark ? "#FFFFFF" : "#1C1C2E" }]}>{t("explore.vipRequiredTitle")}</Text>
            <Text style={[styles.vipPopupDesc, { color: isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)" }]}>{t("explore.vipRequiredMsg")}</Text>
            <Pressable
              onPress={() => { setShowVipPopup(false); router.push({ pathname: "/(tabs)/market", params: { tab: "premium" } } as any); }}
              style={({ pressed }) => [styles.vipPopupBtn, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient colors={["#FFD700", "#FF9500"]} style={styles.vipPopupBtnGradient}>
                <Feather name="star" size={16} color="#fff" />
                <Text style={styles.vipPopupBtnText}>VIP</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setShowVipPopup(false)} style={styles.vipPopupDismiss}>
              <Text style={[styles.vipPopupDismissText, { color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)" }]}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showCreateSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateSheet(false)}
      >
        <KeyboardAvoidingView
          style={styles.sheetOverlayWrap}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.sheetOverlay} onPress={() => setShowCreateSheet(false)} />
          <View style={[styles.createSheet, { backgroundColor: isDark ? "#1C1C2E" : "#F2F2F7", paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetTitleRow}>
              <LinearGradient colors={["#7C3AED", "#A855F7"]} style={styles.sheetTitleIcon}>
                <Feather name="user-plus" size={18} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.text.primary }]}>{t("explore.createChar")}</Text>
                <View style={styles.vipBadge}>
                  <Feather name="star" size={10} color="#FFD700" />
                  <Text style={styles.vipBadgeText}>VIP</Text>
                </View>
              </View>
            </View>

            <Pressable onPress={handlePickPhoto} style={[styles.photoPickerBtn, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }]}>
              {formPhoto ? (
                <Image source={{ uri: formPhoto }} style={styles.photoPickerImg} />
              ) : (
                <View style={styles.photoPickerEmpty}>
                  <Feather name="camera" size={24} color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} />
                  <Text style={[styles.photoPickerLabel, { color: colors.text.tertiary }]}>{t("explore.customPhoto")}</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 2, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
                <TextInput
                  placeholder={t("explore.customName")}
                  placeholderTextColor={colors.text.tertiary}
                  value={formName}
                  onChangeText={setFormName}
                  style={[styles.formInput, { color: colors.text.primary }]}
                  maxLength={30}
                />
              </View>
              <View style={[styles.formField, { flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
                <TextInput
                  placeholder={t("explore.customAge")}
                  placeholderTextColor={colors.text.tertiary}
                  value={formAge}
                  onChangeText={(v) => setFormAge(v.replace(/[^0-9]/g, ""))}
                  style={[styles.formInput, { color: colors.text.primary }]}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={[styles.formField, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", minHeight: 80 }]}>
              <TextInput
                placeholder={t("explore.customDesc")}
                placeholderTextColor={colors.text.tertiary}
                value={formDesc}
                onChangeText={setFormDesc}
                style={[styles.formInput, { color: colors.text.primary }]}
                multiline
                maxLength={300}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.genderRow}>
              <Text style={[styles.genderLabel, { color: colors.text.secondary }]}>{t("explore.customGender")}</Text>
              <View style={styles.genderBtns}>
                <Pressable
                  onPress={() => setFormGender("female")}
                  style={[styles.genderBtn, formGender === "female" && styles.genderBtnActive, { borderColor: formGender === "female" ? "#A855F7" : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)") }]}
                >
                  <Text style={[styles.genderBtnText, formGender === "female" && styles.genderBtnTextActive, { color: formGender === "female" ? "#A855F7" : colors.text.secondary }]}>
                    {t("explore.genderFemale")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setFormGender("male")}
                  style={[styles.genderBtn, formGender === "male" && styles.genderBtnActive, { borderColor: formGender === "male" ? "#A855F7" : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)") }]}
                >
                  <Text style={[styles.genderBtnText, formGender === "male" && styles.genderBtnTextActive, { color: formGender === "male" ? "#A855F7" : colors.text.secondary }]}>
                    {t("explore.genderMale")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setFormGender("non-binary")}
                  style={[styles.genderBtn, formGender === "non-binary" && styles.genderBtnActive, { borderColor: formGender === "non-binary" ? "#A855F7" : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)") }]}
                >
                  <Text style={[styles.genderBtnText, formGender === "non-binary" && styles.genderBtnTextActive, { color: formGender === "non-binary" ? "#A855F7" : colors.text.secondary }]}>
                    {t("explore.genderNonBinary")}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={handleCreateChar}
              disabled={formCreating}
              style={({ pressed }) => [styles.createBtn, pressed && { opacity: 0.8 }]}
            >
              <LinearGradient colors={["#7C3AED", "#A855F7"]} style={styles.createBtnGrad}>
                <Text style={styles.createBtnText}>{formCreating ? "..." : t("explore.customCreate")}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  aiCompanionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  aiCompanionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#7C3AED",
    letterSpacing: 0.2,
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
  filtersRow: { paddingHorizontal: 14, marginTop: 10 },
  filterBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.2)",
  },
  filterBtnActive: {
    borderColor: "transparent",
  },
  filterBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(124,58,237,0.8)" },
  filterBtnTextActive: { color: "#FFFFFF" },
  fortuneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(74,222,128,0.07)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
  },
  fortuneBtnActive: {
    backgroundColor: "rgba(34,197,94,0.75)",
    borderColor: "rgba(74,222,128,0.6)",
  },
  fortuneBtnText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#22A360" },
  fortuneBtnTextActive: { color: "#FFFFFF", fontFamily: "Inter_500Medium" },
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

  // Tarot banner (secondary / compact)
  tarotBanner: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    height: 54,
    shadowColor: "#A855F7",
    shadowOffset: { width: 0, height: 2 },
  },
  tarotOrbBig: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(139,92,246,0.1)",
    top: -20,
    right: 40,
  },
  shimmer: {
    position: "absolute",
    top: -20,
    left: 0,
    width: 40,
    height: 120,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
  },
  tarotContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  tarotEyeWrap: {
    shadowColor: "#C084FC",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  tarotEyeGrad: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tarotTextCol: {
    flex: 1,
    gap: 1,
  },
  tarotBannerTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(243,232,255,0.85)",
    letterSpacing: -0.1,
  },
  tarotBannerSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(216,180,254,0.55)",
  },
  tarotArrowWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(192,132,252,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  tarotBottomLine: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: "rgba(192,132,252,0.12)",
  },

  grid: { paddingHorizontal: 14, paddingTop: 4 },
  row: { justifyContent: "space-between" },
  cardWrapper: { flex: 1, maxWidth: "50%" },

  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
  },

  sheetOverlayWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  vipOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  vipSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
    gap: 12,
  },
  vipIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  vipPopupTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  vipPopupDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  vipPopupBtn: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  vipPopupBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 8,
  },
  vipPopupBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  vipPopupDismiss: {
    paddingVertical: 12,
  },
  vipPopupDismissText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  createSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sheetTitleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  vipBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },
  photoPickerBtn: {
    alignSelf: "center",
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderStyle: "dashed",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPickerImg: {
    width: "100%",
    height: "100%",
    borderRadius: 42,
  },
  photoPickerEmpty: {
    alignItems: "center",
    gap: 4,
  },
  photoPickerLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  formField: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  formInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  createBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },
  createBtnGrad: {
    paddingVertical: 14,
    alignItems: "center",
  },
  createBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  genderRow: {
    flexDirection: "column",
    marginTop: 10,
    paddingHorizontal: 2,
    gap: 8,
  },
  genderLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  genderBtns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  genderBtnActive: {
    backgroundColor: "rgba(168,85,247,0.1)",
  },
  genderBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  genderBtnTextActive: {
    fontFamily: "Inter_600SemiBold",
  },
  coffeeBanner: {
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 12,
    overflow: "hidden",
    opacity: 0.85,
  },
  coffeeBannerGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  coffeeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  coffeeTextCol: {
    flex: 1,
  },
  coffeeBannerTitle: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: -0.1,
  },
  coffeeBannerSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },
});
