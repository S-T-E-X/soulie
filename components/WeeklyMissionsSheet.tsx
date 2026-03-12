import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { type Mission } from "@/hooks/useWeeklyMissions";

interface Props {
  visible: boolean;
  onClose: () => void;
  missions: Mission[];
  getMissionProgress: (m: Mission) => number;
  completedCount: number;
  totalMissions: number;
  language?: string;
  claimReward: (id: string) => void;
}

function MissionRow({
  mission,
  progress,
  language,
  onClaim,
}: {
  mission: Mission;
  progress: number;
  language: string;
  onClaim: () => void;
}) {
  const completed = progress >= mission.target;
  const pct = Math.min(progress / mission.target, 1);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: pct,
      useNativeDriver: false,
      damping: 16,
      stiffness: 90,
      delay: 200,
    }).start();
  }, [pct]);

  const barW = widthAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const title = language === "en" ? mission.titleEn : mission.title;
  const desc = language === "en" ? mission.descriptionEn : mission.description;

  return (
    <View style={[styles.missionRow, completed && styles.missionRowDone]}>
      <View style={styles.missionIcon}>
        <LinearGradient
          colors={completed ? ["#34C759", "#2DB34A"] : [Colors.userBubble.from, Colors.userBubble.to]}
          style={styles.missionIconGrad}
        >
          <Feather name={mission.icon as any} size={16} color="#fff" />
        </LinearGradient>
      </View>
      <View style={styles.missionContent}>
        <View style={styles.missionTop}>
          <Text style={[styles.missionTitle, completed && styles.missionTitleDone]}>{title}</Text>
          <View style={styles.rewardBadge}>
            <Feather name="zap" size={10} color="#FFD700" />
            <Text style={styles.rewardText}>{mission.reward}</Text>
          </View>
        </View>
        <Text style={styles.missionDesc}>{desc}</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: barW }]}>
              <LinearGradient
                colors={completed ? ["#34C759", "#2DB34A"] : [Colors.userBubble.from, Colors.userBubble.to]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={styles.progressLabel}>
            {progress}/{mission.target}
          </Text>
        </View>
      </View>
      {completed && (
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClaim();
          }}
          style={styles.claimBtn}
          hitSlop={4}
        >
          <Feather name="check-circle" size={22} color="#34C759" />
        </Pressable>
      )}
    </View>
  );
}

export function WeeklyMissionsSheet({
  visible,
  onClose,
  missions,
  getMissionProgress,
  completedCount,
  totalMissions,
  language = "tr",
  claimReward,
}: Props) {
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 180,
      }).start();
    } else {
      slideAnim.setValue(500);
    }
  }, [visible]);

  const title = language === "en" ? "Weekly Missions" : "Haftalık Görevler";
  const subtitle =
    language === "en"
      ? `${completedCount}/${totalMissions} completed`
      : `${completedCount}/${totalMissions} tamamlandı`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <Pressable>
            {Platform.OS === "ios" ? (
              <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8F8FF" }]} />
            )}

            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{title}</Text>
                <Text style={styles.sheetSubtitle}>{subtitle}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={20} color={Colors.text.secondary} />
              </Pressable>
            </View>

            <View style={styles.overallProgress}>
              <View style={styles.overallBar}>
                {Array.from({ length: totalMissions }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.overallSegment,
                      i < completedCount && styles.overallSegmentDone,
                      i < totalMissions - 1 && { marginRight: 4 },
                    ]}
                  />
                ))}
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.missionList}>
              {missions.map((m) => (
                <MissionRow
                  key={m.id}
                  mission={m}
                  progress={getMissionProgress(m)}
                  language={language}
                  onClaim={() => claimReward(m.id)}
                />
              ))}
              <View style={{ height: 32 }} />
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    maxHeight: "85%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  sheetSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    marginTop: 2,
  },
  overallProgress: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  overallBar: {
    flexDirection: "row",
  },
  overallSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  overallSegmentDone: {
    backgroundColor: "#34C759",
  },
  missionList: {
    paddingHorizontal: 20,
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  missionRowDone: {
    backgroundColor: "rgba(52,199,89,0.06)",
    borderColor: "rgba(52,199,89,0.2)",
  },
  missionIcon: {},
  missionIconGrad: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  missionContent: {
    flex: 1,
    gap: 3,
  },
  missionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  missionTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  missionTitleDone: {
    color: "#2DB34A",
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,215,0,0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rewardText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#B8860B",
  },
  missionDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.07)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.tertiary,
    minWidth: 28,
    textAlign: "right",
  },
  claimBtn: {
    padding: 4,
  },
});
