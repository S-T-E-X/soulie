import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  claimed,
  language,
  onClaim,
}: {
  mission: Mission;
  progress: number;
  claimed: boolean;
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
    <View style={[styles.missionRow, completed && styles.missionRowDone, claimed && styles.missionRowClaimed]}>
      <View style={styles.missionIcon}>
        <LinearGradient
          colors={claimed ? ["#8E8E93", "#636366"] : completed ? ["#34C759", "#2DB34A"] : [Colors.userBubble.from, Colors.userBubble.to]}
          style={styles.missionIconGrad}
        >
          <Feather name={(claimed ? "check" : mission.icon) as any} size={16} color="#fff" />
        </LinearGradient>
      </View>
      <View style={styles.missionContent}>
        <View style={styles.missionTop}>
          <Text style={[styles.missionTitle, completed && styles.missionTitleDone, claimed && styles.missionTitleClaimed]}>
            {title}
          </Text>
          <View style={[styles.rewardBadge, claimed && styles.rewardBadgeClaimed]}>
            <Feather name="zap" size={10} color={claimed ? "#8E8E93" : "#FFD700"} />
            <Text style={[styles.rewardText, claimed && styles.rewardTextClaimed]}>{mission.reward} XP</Text>
          </View>
        </View>
        <Text style={styles.missionDesc}>{desc}</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <Animated.View style={[styles.progressFill, { width: barW }]}>
              <LinearGradient
                colors={claimed ? ["#8E8E93", "#636366"] : completed ? ["#34C759", "#2DB34A"] : [Colors.userBubble.from, Colors.userBubble.to]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={styles.progressLabel}>
            {Math.min(progress, mission.target)}/{mission.target}
          </Text>
        </View>
      </View>
      {completed && !claimed && (
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClaim();
          }}
          style={styles.claimBtn}
          hitSlop={4}
        >
          <LinearGradient colors={["#34C759", "#2DB34A"]} style={styles.claimBtnGrad}>
            <Feather name="gift" size={14} color="#fff" />
          </LinearGradient>
        </Pressable>
      )}
      {claimed && (
        <View style={styles.claimedBadge}>
          <Feather name="check-circle" size={20} color="#8E8E93" />
        </View>
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
}: Props & { getIsClaimed?: (id: string) => boolean; missionsProgress?: Record<string, any> }) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 180,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 600,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const title = language === "en" ? "Weekly Missions" : "Haftalık Görevler";
  const subtitle =
    language === "en"
      ? `${completedCount}/${totalMissions} completed`
      : `${completedCount}/${totalMissions} tamamlandı`;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
          pointerEvents={visible ? "auto" : "none"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.sheetBg} />

          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>{title}</Text>
              <Text style={styles.sheetSubtitle}>{subtitle}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.missionListContent}
            bounces={false}
          >
            {missions.map((m) => {
              const prog = getMissionProgress(m);
              return (
                <MissionRow
                  key={m.id}
                  mission={m}
                  progress={prog}
                  claimed={false}
                  language={language}
                  onClaim={() => claimReward(m.id)}
                />
              );
            })}
            <View style={{ height: 32 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#F8F8FF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    minHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F8F8FF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
  closeBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
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
  overallBar: { flexDirection: "row" },
  overallSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  overallSegmentDone: { backgroundColor: "#34C759" },
  missionListContent: {
    paddingHorizontal: 20,
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  missionRowDone: {
    backgroundColor: "rgba(52,199,89,0.04)",
    borderColor: "rgba(52,199,89,0.2)",
  },
  missionRowClaimed: {
    backgroundColor: "rgba(0,0,0,0.02)",
    borderColor: "rgba(0,0,0,0.05)",
    opacity: 0.7,
  },
  missionIcon: {},
  missionIconGrad: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  missionContent: { flex: 1, gap: 3 },
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
    flex: 1,
    marginRight: 8,
  },
  missionTitleDone: { color: "#2DB34A" },
  missionTitleClaimed: { color: Colors.text.tertiary },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,215,0,0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rewardBadgeClaimed: { backgroundColor: "rgba(0,0,0,0.06)" },
  rewardText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#B8860B",
  },
  rewardTextClaimed: { color: "#8E8E93" },
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
  claimBtn: {},
  claimBtnGrad: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  claimedBadge: {
    width: 36,
    justifyContent: "center",
    alignItems: "center",
  },
});
