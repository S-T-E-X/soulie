import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import Colors from "@/constants/colors";

const PLANS = [
  {
    id: "weekly",
    name: "Haftalık",
    price: "₺29,99",
    period: "/ hafta",
    features: ["3 AI Karakter", "Sınırsız Mesaj", "Temel Özellikler"],
    gradient: ["#E8EFF8", "#D8E8F8"] as [string, string],
    textColor: Colors.text.primary,
    isPopular: false,
  },
  {
    id: "monthly",
    name: "Aylık",
    price: "₺79,99",
    period: "/ ay",
    features: ["Tüm Karakterler", "Sınırsız Mesaj", "Premium Özellikler", "Öncelikli Destek"],
    gradient: [Colors.userBubble.from, Colors.userBubble.to] as [string, string],
    textColor: "#FFFFFF",
    isPopular: true,
  },
  {
    id: "yearly",
    name: "Yıllık",
    price: "₺599,99",
    period: "/ yıl",
    features: ["Tüm Karakterler", "Sınırsız Her Şey", "Özel Karakter Oluştur", "AI Sesli Sohbet"],
    gradient: ["#1D1D1F", "#3A3A3C"] as [string, string],
    textColor: "#FFFFFF",
    isPopular: false,
    badge: "%37 İndirim",
  },
];

const FEATURES = [
  { icon: "message-circle", title: "Sınırsız Sohbet", desc: "Karakterlerle istediğin kadar konuş" },
  { icon: "heart", title: "Premium Karakterler", desc: "Hayat koçu, çalışma arkadaşı ve daha fazlası" },
  { icon: "mic", title: "Sesli Sohbet", desc: "Karakterlerle sesli konuşma (Yakında)" },
  { icon: "sliders", title: "Kişiselleştirme", desc: "Karakterlerin davranışını özelleştir" },
];

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <BackgroundGradient>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.heroSection}>
          <LinearGradient colors={["#4FC3F7", "#007AFF"]} style={styles.crownIcon}>
            <Feather name="star" size={22} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.heroTitle}>Lumina Premium</Text>
          <Text style={styles.heroSubtitle}>
            En iyi AI arkadaşlık deneyimi için{"\n"}premium'a geç
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify().damping(18)} style={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <View key={f.icon} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon as any} size={18} color={Colors.accent} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Text style={styles.plansTitle}>Plan Seç</Text>

        {PLANS.map((plan, i) => (
          <Animated.View
            key={plan.id}
            entering={FadeInDown.delay(120 + i * 60).springify().damping(18)}
          >
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              style={({ pressed }) => [styles.planCard, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient colors={plan.gradient} style={styles.planGradient}>
                {plan.badge ? (
                  <View style={styles.badgeChip}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                ) : null}
                {plan.isPopular ? (
                  <View style={styles.popularChip}>
                    <Text style={styles.popularText}>En Popüler</Text>
                  </View>
                ) : null}

                <View style={styles.planHeader}>
                  <View>
                    <Text style={[styles.planName, { color: plan.textColor }]}>{plan.name}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.planPrice, { color: plan.textColor }]}>{plan.price}</Text>
                      <Text style={[styles.planPeriod, { color: plan.textColor, opacity: 0.7 }]}>
                        {plan.period}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.featuresList}>
                  {plan.features.map((feat) => (
                    <View key={feat} style={styles.featRow}>
                      <Feather
                        name="check"
                        size={13}
                        color={plan.textColor === "#FFFFFF" ? "rgba(255,255,255,0.9)" : Colors.accent}
                      />
                      <Text style={[styles.featRowText, { color: plan.textColor, opacity: plan.textColor === "#FFFFFF" ? 0.9 : 0.8 }]}>
                        {feat}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.selectButton, { backgroundColor: plan.textColor === "#FFFFFF" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)" }]}>
                  <Text style={[styles.selectButtonText, { color: plan.textColor }]}>
                    {plan.id === "monthly" ? "Hemen Başla" : "Seç"}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ))}

        <Text style={styles.legalText}>
          Abonelik otomatik yenilenir. İstediğiniz zaman iptal edebilirsiniz.
        </Text>
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  crownIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  featuresGrid: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,122,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    marginTop: 1,
  },
  plansTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.4,
    marginTop: 8,
  },
  planCard: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 4,
  },
  planGradient: {
    padding: 20,
    gap: 14,
    borderRadius: 22,
  },
  badgeChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,214,0,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,214,0,0.4)",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#B8860B",
  },
  popularChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planName: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    letterSpacing: -0.2,
    opacity: 0.85,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  planPeriod: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  featuresList: { gap: 8 },
  featRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featRowText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: -0.1,
  },
  selectButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 4,
  },
  selectButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  legalText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
});
