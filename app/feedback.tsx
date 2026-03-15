import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { useI18n } from "@/hooks/useI18n";

const FEEDBACK_KEY = "soulie_feedback_v1";
const ACCENT = Colors.accent;

const CATEGORY_IDS = ["bug", "suggestion", "praise", "other"] as const;
const CATEGORY_ICONS: Record<string, any> = {
  bug: "alert-circle",
  suggestion: "zap",
  praise: "heart",
  other: "message-circle",
};

const RATINGS = [1, 2, 3, 4, 5];

type FeedbackEntry = {
  id: string;
  category: string;
  rating: number;
  text: string;
  timestamp: number;
};

async function saveFeedback(entry: FeedbackEntry) {
  try {
    const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
    const existing: FeedbackEntry[] = raw ? JSON.parse(raw) : [];
    existing.unshift(entry);
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(existing.slice(0, 100)));
  } catch {}
}

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [category, setCategory] = useState("suggestion");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) {
      Alert.alert(t("common.error"), t("feedback.writeFirst"));
      return;
    }
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const entry: FeedbackEntry = {
      id: Date.now().toString(),
      category,
      rating,
      text: text.trim(),
      timestamp: Date.now(),
    };
    await saveFeedback(entry);
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Feather name="chevron-left" size={24} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.navTitle}>{t("feedback.title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        {submitted ? (
          <View style={styles.successContainer}>
            <LinearGradient colors={["rgba(52,199,89,0.12)", "rgba(52,199,89,0.04)"]} style={styles.successIcon}>
              <Feather name="check-circle" size={48} color="#34C759" />
            </LinearGradient>
            <Text style={styles.successTitle}>{t("feedback.thankYou")}</Text>
            <Text style={styles.successDesc}>{t("feedback.receivedDesc")}</Text>
            <Pressable style={styles.doneBtn} onPress={() => router.back()}>
              <LinearGradient colors={[Colors.userBubble.from, Colors.userBubble.to]} style={styles.doneBtnGrad}>
                <Text style={styles.doneBtnText}>{t("common.goBack")}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.intro}>{t("feedback.intro")}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("feedback.category")}</Text>
              <View style={styles.categoriesGrid}>
                {CATEGORY_IDS.map((id) => (
                  <Pressable
                    key={id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCategory(id);
                    }}
                    style={[styles.categoryChip, category === id && styles.categoryChipActive]}
                  >
                    <Feather name={CATEGORY_ICONS[id]} size={14} color={category === id ? "#fff" : Colors.text.secondary} />
                    <Text style={[styles.categoryLabel, category === id && styles.categoryLabelActive]}>{t(`feedback.cat_${id}` as any)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("feedback.ratingLabel")}</Text>
              <View style={styles.starsRow}>
                {RATINGS.map((r) => (
                  <Pressable key={r} onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRating(r);
                  }} hitSlop={4}>
                    <Feather name="star" size={32} color={r <= rating ? "#FFD700" : "#E5E5EA"} />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.ratingLabel}>
                {rating === 1 ? t("feedback.rating1") : rating === 2 ? t("feedback.rating2") : rating === 3 ? t("feedback.rating3") : rating === 4 ? t("feedback.rating4") : t("feedback.rating5")}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("feedback.message")}</Text>
              <TextInput
                style={styles.textInput}
                value={text}
                onChangeText={setText}
                placeholder={t("feedback.messagePlaceholder")}
                placeholderTextColor="rgba(0,0,0,0.3)"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{text.length}/1000</Text>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={styles.submitBtn}
            >
              <LinearGradient
                colors={[Colors.userBubble.from, Colors.userBubble.to]}
                style={[styles.submitBtnGrad, submitting && { opacity: 0.7 }]}
              >
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>{submitting ? t("feedback.sending") : t("feedback.send")}</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8FC" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#F8F8FC",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text.primary },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, gap: 24 },
  intro: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text.secondary, lineHeight: 21 },
  section: { gap: 10 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text.primary, textTransform: "uppercase", letterSpacing: 0.6 },
  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.06)", borderWidth: 1.5, borderColor: "transparent" },
  categoryChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  categoryLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text.secondary },
  categoryLabelActive: { color: "#fff", fontFamily: "Inter_600SemiBold" },
  starsRow: { flexDirection: "row", gap: 8 },
  ratingLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.text.secondary, marginTop: -4 },
  textInput: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#333",
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
  },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.text.tertiary, alignSelf: "flex-end" },
  submitBtn: { borderRadius: 16, overflow: "hidden" },
  submitBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  successContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 16 },
  successIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center" },
  successTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#111", letterSpacing: -0.8 },
  successDesc: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text.secondary, textAlign: "center", lineHeight: 22 },
  doneBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8, alignSelf: "stretch" },
  doneBtnGrad: { paddingVertical: 16, alignItems: "center" },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
