import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { type Character } from "@/constants/characters";
import Colors from "@/constants/colors";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  character: Character;
  onPress: () => void;
  hasChat?: boolean;
  streak?: number;
}

function CharacterImage({ source, gradientColors, noImage }: { source: any; gradientColors: [string, string]; noImage?: boolean }) {
  const [loaded, setLoaded] = useState(false);

  if (noImage || source == null) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1], "#0D0020"]}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.mysticalOverlay}>
          <View style={styles.mysticalStars}>
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.star,
                  {
                    top: `${10 + (i * 13) % 70}%`,
                    left: `${5 + (i * 17) % 80}%`,
                    opacity: 0.3 + (i % 3) * 0.2,
                    width: 2 + (i % 3),
                    height: 2 + (i % 3),
                  } as any,
                ]}
              />
            ))}
          </View>
          <View style={styles.eyeContainer}>
            <LinearGradient
              colors={["#9B59B6", "#6B21A8"]}
              style={styles.eyeGrad}
            >
              <Feather name="eye" size={28} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {!loaded ? (
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1]]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Animated.Image
        source={source}
        style={[styles.characterImage, !loaded && { opacity: 0 }]}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        fadeDuration={Platform.OS === "android" ? 200 : 0}
      />
    </View>
  );
}

export function CharacterCard({ character, onPress, hasChat, streak = 0 }: Props) {
  const { t } = useI18n();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View style={styles.card}>
          <CharacterImage
            source={character.image}
            gradientColors={character.gradientColors}
            noImage={character.noImage}
          />

          {character.isPremium ? (
            <View style={styles.premiumBadge}>
              <Feather name="star" size={9} color="#FFD700" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          ) : null}

          {streak >= 2 ? (
            <View style={styles.streakBadge}>
              <Feather name="zap" size={10} color="#FF9500" />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          ) : null}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.65)"]}
            style={styles.overlay}
          />

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{character.name}</Text>
              <Text style={styles.age}>{character.age}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{t(character.shortRoleKey as any)}</Text>
            </View>
          </View>

          {hasChat ? (
            <View style={styles.activeDot} />
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    margin: 6,
  },
  pressable: {
    borderRadius: 20,
    overflow: "hidden",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#1A0A2E",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    aspectRatio: 0.72,
  },
  characterImage: {
    width: "100%",
    height: "100%",
  },
  mysticalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  mysticalStars: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: "absolute",
    borderRadius: 50,
    backgroundColor: "#E0CFFF",
  },
  eyeContainer: {
    marginTop: -16,
  },
  eyeGrad: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9B59B6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  premiumBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 3,
    zIndex: 2,
  },
  premiumText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#FFD700",
    letterSpacing: 0.5,
  },
  streakBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
    zIndex: 2,
  },
  streakText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#FF9500",
  },
  info: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 5,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  name: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  age: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  roleText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 0.2,
  },
  activeDot: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
