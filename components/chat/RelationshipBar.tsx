import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";

export const RELATIONSHIP_LEVELS = [
  { xp: 0, name: "Yabancı", color: ["#8E8E93", "#636366"] as [string, string] },
  { xp: 50, name: "Tanıdık", color: [Colors.userBubble.from, Colors.userBubble.to] as [string, string] },
  { xp: 150, name: "Dost", color: ["#5856D6", "#AF52DE"] as [string, string] },
  { xp: 300, name: "Yakın Dost", color: ["#FF9500", "#FF6B00"] as [string, string] },
  { xp: 500, name: "Sevgili", color: ["#FF2D55", "#FF6B9D"] as [string, string] },
];

export function getRelationshipLevel(xp: number) {
  let levelIndex = 0;
  for (let i = RELATIONSHIP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= RELATIONSHIP_LEVELS[i].xp) {
      levelIndex = i;
      break;
    }
  }
  const current = RELATIONSHIP_LEVELS[levelIndex];
  const next = RELATIONSHIP_LEVELS[levelIndex + 1];
  const currentXp = xp - current.xp;
  const neededXp = next ? next.xp - current.xp : 1;
  const progress = next ? Math.min(currentXp / neededXp, 1) : 1;
  return { levelIndex, name: current.name, color: current.color, progress, currentXp, neededXp: next ? next.xp - current.xp : 0, isMax: !next };
}

interface Props {
  xp: number;
}

export function RelationshipBar({ xp }: Props) {
  const level = getRelationshipLevel(xp);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const [showCelebration, setShowCelebration] = useState(false);
  const prevLevelRef = useRef(level.levelIndex);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: level.progress,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [level.progress]);

  useEffect(() => {
    if (prevLevelRef.current < level.levelIndex) {
      setShowCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      celebrationAnim.setValue(0);
      Animated.sequence([
        Animated.timing(celebrationAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(celebrationAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setShowCelebration(false));
    }
    prevLevelRef.current = level.levelIndex;
  }, [level.levelIndex]);

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={[styles.levelBadge, { backgroundColor: level.color[0] + "20" }]}>
          <View style={[styles.levelDot, { backgroundColor: level.color[0] }]} />
          <Text style={[styles.levelName, { color: level.color[0] }]}>{level.name}</Text>
        </View>
        {!level.isMax && (
          <Text style={styles.xpText}>{level.currentXp}/{level.neededXp} XP</Text>
        )}
        {level.isMax && (
          <Text style={styles.xpText}>MAX</Text>
        )}
      </View>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, { width: barWidth }]}>
          <LinearGradient
            colors={level.color}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      {showCelebration && (
        <Animated.View style={[styles.celebration, {
          opacity: celebrationAnim,
          transform: [{ scale: celebrationAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }]}>
          <Text style={styles.celebrationText}>Seviye atladın! {level.name}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  levelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  levelName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  xpText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.text.tertiary,
  },
  barBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
    overflow: "hidden",
  },
  celebration: {
    position: "absolute",
    top: -2,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  celebrationText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FF9500",
    backgroundColor: "rgba(255,149,0,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
});
