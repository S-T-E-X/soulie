import React, { useEffect } from "react";
import { View, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(-4, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animStyle]} />;
}

export function TypingIndicator() {
  return (
    <View style={styles.row}>
      <View style={styles.avatarContainer}>
        <LinearGradient colors={["#4FC3F7", "#007AFF"]} style={styles.avatar} />
      </View>
      <View style={styles.bubble}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]} />
        )}
        <View style={styles.dotsContainer}>
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginHorizontal: 16,
    marginVertical: 6,
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubble: {
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fallback: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#8E8E93",
  },
});
