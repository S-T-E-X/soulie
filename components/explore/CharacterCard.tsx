import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { type Character } from "@/constants/characters";
import Colors from "@/constants/colors";

interface Props {
  character: Character;
  onPress: () => void;
  hasChat?: boolean;
}

function CharacterImage({ source }: { source: any }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={StyleSheet.absoluteFill}>
      {!loaded ? (
        <View style={styles.imagePlaceholder}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
        </View>
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

export function CharacterCard({ character, onPress, hasChat }: Props) {
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
          <CharacterImage source={character.image} />

          {character.isPremium ? (
            <View style={styles.premiumBadge}>
              <Feather name="star" size={9} color="#FFD700" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          ) : null}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.55)"]}
            style={styles.overlay}
          />

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{character.name}</Text>
              <Text style={styles.age}>{character.age}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{character.shortRole}</Text>
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
    backgroundColor: "#E5E5EA",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    aspectRatio: 0.72,
  },
  characterImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#D1D1D6",
    justifyContent: "center",
    alignItems: "center",
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
    top: 10,
    left: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
