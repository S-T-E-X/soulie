import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import Colors from "@/constants/colors";
import { useGifts, GIFTS, GIFT_IMAGES, COIN_PACKAGES } from "@/contexts/GiftContext";
import { Image } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/hooks/useI18n";

const PRODUCT_IDS = {
  weekly: "com.soulie.vip.weekly",
  monthly: "com.soulie.vip.monthly",
  yearly: "com.soulie.vip.yearly",
} as const;

const ALL_FEAT_KEYS = [
  "market.featAllChars",
  "market.featUnlimitedMessages",
  "market.featPremiumFeatures",
  "market.featPrioritySupport",
  "market.featVoiceChat",
  "market.featUnlimitedTarot",
  "market.featCustomChar",
];

const PLAN_META = [
  {
    id: "weekly",
    productId: PRODUCT_IDS.weekly,
    price: "$4.99",
    gradient: [Colors.userBubble.from, Colors.userBubble.to] as [string, string],
    textColor: "#FFFFFF",
    isPopular: false,
    badge: null as string | null,
    featKeys: ALL_FEAT_KEYS,
    periodKey: "market.perWeek",
    nameKey: "market.weekly",
  },
  {
    id: "monthly",
    productId: PRODUCT_IDS.monthly,
    price: "$14.99",
    gradient: ["#1D1D1F", "#3A3A3C"] as [string, string],
    textColor: "#FFFFFF",
    isPopular: true,
    badge: "market.discount30" as string | null,
    featKeys: ALL_FEAT_KEYS,
    periodKey: "market.perMonth",
    nameKey: "market.monthly",
  },
  {
    id: "yearly",
    productId: PRODUCT_IDS.yearly,
    price: "$79.99",
    gradient: ["#2D0654", "#6B21A8"] as [string, string],
    textColor: "#FFFFFF",
    isPopular: false,
    badge: "market.discount55" as string | null,
    featKeys: ALL_FEAT_KEYS,
    periodKey: "market.perYear",
    nameKey: "market.yearly",
  },
];

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
  const { coins, purchaseGift, getInventoryCount, addCoins } = useGifts();
  const { isDark, colors } = useTheme();
  const { user, isVipActive } = useAuth();
  const { t } = useI18n();
  const validTabs = ["premium", "gifts", "coins"] as const;
  const [activeTab, setActiveTab] = useState<"premium" | "gifts" | "coins">(
    validTabs.includes(initialTab as any) ? (initialTab as any) : "premium"
  );

  React.useEffect(() => {
    if (validTabs.includes(initialTab as any)) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  const handleCoinPurchase = (pkg: typeof COIN_PACKAGES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t("market.comingSoon"),
      `${pkg.price} ile satın almaya yönlendirileceksin. In-App Purchase ödemesi tamamlandığında ${pkg.coins + (pkg.bonus ?? 0)} coin hesabına eklenecek.`,
      [{ text: t("common.cancel") }]
    );
  };

  const handleGiftPurchase = (giftId: string) => {
    const gift = GIFTS.find((g) => g.id === giftId);
    if (!gift) return;
    if (coins < gift.price) {
      Alert.alert(
        t("gifts.insufficientCoins"),
        t("gifts.insufficientCoinsMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("gifts.buyCoins"), onPress: () => setActiveTab("coins") },
        ]
      );
      return;
    }
    Alert.alert(
      t("market.confirmGiftTitle", { name: gift.name }),
      t("market.confirmGiftMessage", { price: String(gift.price), name: gift.name }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("market.buy"),
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await purchaseGift(giftId);
            Alert.alert(t("market.success"), t("market.giftAddedToInventory", { name: gift.name }));
          },
        },
      ]
    );
  };

  return (
    <BackgroundGradient>
      <StatusBar barStyle={colors.statusBar} />

      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t("market.title")}</Text>
        <Pressable
          onPress={() => setActiveTab("coins")}
          style={({ pressed }) => [styles.coinChip, { backgroundColor: isDark ? "rgba(255,215,0,0.15)" : "rgba(255,215,0,0.1)" }, pressed && { opacity: 0.8 }]}
        >
          <Feather name="circle" size={14} color="#FFD700" />
          <Text style={[styles.coinChipText, { color: colors.text.primary }]}>{coins}</Text>
          <Feather name="plus" size={13} color={Colors.accent} />
        </Pressable>
      </View>

      <View style={[styles.tabBar, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.6)" }]}>
        {(["premium", "gifts", "coins"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab);
            }}
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeTab === tab ? Colors.accent : (isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)"),
                borderColor: activeTab === tab ? Colors.accent : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"),
              },
            ]}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === tab ? "#fff" : (isDark ? "rgba(255,255,255,0.7)" : "#1D1D1F") }, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === "premium" ? t("market.premium") : tab === "gifts" ? t("market.gifts") : t("market.coins")}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "premium" && (
          <>
            <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.heroSection}>
              <LinearGradient colors={["#4FC3F7", "#007AFF"]} style={styles.crownIcon}>
                <Feather name="star" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.heroTitle, { color: colors.text.primary }]}>Soulie Premium</Text>
              <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
                {t("market.premiumHeroSubtitle")}
              </Text>
            </Animated.View>

            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t("market.choosePlan")}</Text>

            {PLAN_META.map((plan, i) => (
              <Animated.View
                key={plan.id}
                entering={FadeInDown.delay(80 + i * 60).springify().damping(18)}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (isVipActive) {
                      Alert.alert(t("market.alreadyVip"), t("market.alreadyVipMessage"));
                      return;
                    }
                    Alert.alert(t("market.comingSoon"), t("market.comingSoonMessage"));
                  }}
                  style={({ pressed }) => [styles.planCard, pressed && { opacity: 0.85 }]}
                >
                  <LinearGradient colors={plan.gradient} style={styles.planGradient}>
                    {plan.badge ? (
                      <View style={styles.badgeChip}>
                        <Text style={styles.badgeText}>{t(plan.badge as any)}</Text>
                      </View>
                    ) : null}
                    {plan.isPopular ? (
                      <View style={styles.popularChip}>
                        <Text style={styles.popularText}>{t("market.mostPopular")}</Text>
                      </View>
                    ) : null}
                    <View style={styles.planHeader}>
                      <View>
                        <Text style={[styles.planName, { color: plan.textColor }]}>{t(plan.nameKey as any)}</Text>
                        <View style={styles.priceRow}>
                          <Text style={[styles.planPrice, { color: plan.textColor }]}>{plan.price}</Text>
                          <Text style={[styles.planPeriod, { color: plan.textColor, opacity: 0.7 }]}>{t(plan.periodKey as any)}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.featuresList}>
                      {plan.featKeys.map((featKey) => (
                        <View key={featKey} style={styles.featRow}>
                          <Feather
                            name="check"
                            size={13}
                            color={plan.textColor === "#FFFFFF" ? "rgba(255,255,255,0.9)" : Colors.accent}
                          />
                          <Text style={[styles.featRowText, { color: plan.textColor, opacity: plan.textColor === "#FFFFFF" ? 0.9 : 0.8 }]}>
                            {t(featKey as any)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.selectButton, { backgroundColor: plan.textColor === "#FFFFFF" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)" }]}>
                      <Text style={[styles.selectButtonText, { color: plan.textColor }]}>
                        {plan.id === "monthly" ? t("market.start") : t("market.select")}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ))}

            <Text style={styles.legalText}>
              {t("market.cancelAnytime")}
            </Text>
          </>
        )}

        {activeTab === "coins" && (
          <>
            <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.heroSection}>
              <LinearGradient colors={["#FFD700", "#FF9500"]} style={styles.crownIcon}>
                <Feather name="circle" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.heroTitle, { color: colors.text.primary }]}>{t("market.buyCoins")}</Text>
              <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
                {t("market.buyCoinsSubtitle")}
              </Text>
              <View style={styles.currentCoinBadge}>
                <Feather name="circle" size={14} color="#FFD700" />
                <Text style={[styles.currentCoinText, { color: isDark ? "#FFFFFF" : Colors.text.primary }]}>{t("market.currentCoins", { count: coins })}</Text>
              </View>
            </Animated.View>

            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t("market.packages")}</Text>

            {COIN_PACKAGES.map((pkg, i) => (
              <Animated.View
                key={pkg.id}
                entering={FadeInDown.delay(80 + i * 60).springify().damping(18)}
              >
                <Pressable
                  onPress={() => handleCoinPurchase(pkg)}
                  style={({ pressed }) => [styles.coinCard, pressed && { opacity: 0.85 }]}
                >
                  <LinearGradient
                    colors={pkg.isPopular ? ["#FFD700", "#FF9500"] : (isDark ? ["#1C1C2E", "#2A2A42"] : ["#F5F5F7", "#ECECEE"])}
                    style={styles.coinCardGrad}
                  >
                    {pkg.isPopular && (
                      <View style={styles.popularCoinChip}>
                        <Text style={styles.popularCoinText}>{t("market.popular")}</Text>
                      </View>
                    )}
                    <View style={styles.coinCardContent}>
                      <View style={styles.coinAmountRow}>
                        <Feather name="circle" size={22} color={pkg.isPopular ? "#fff" : "#FFD700"} />
                        <Text style={[styles.coinAmount, { color: pkg.isPopular ? "#fff" : colors.text.primary }]}>
                          {(pkg.coins + (pkg.bonus ?? 0)).toLocaleString()}
                        </Text>
                        {pkg.bonus ? (
                          <View style={[styles.bonusChip, { backgroundColor: pkg.isPopular ? "rgba(255,255,255,0.25)" : "rgba(0,122,255,0.1)" }]}>
                            <Text style={[styles.bonusText, { color: pkg.isPopular ? "#fff" : colors.accent }]}>
                              +{pkg.bonus} bonus
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.coinCardPrice, { color: pkg.isPopular ? "#fff" : colors.text.secondary }]}>
                        {pkg.price}
                      </Text>
                    </View>
                    <View style={[styles.coinBuyBtn, { backgroundColor: pkg.isPopular ? "rgba(255,255,255,0.25)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }]}>
                      <Text style={[styles.coinBuyBtnText, { color: pkg.isPopular ? "#fff" : colors.text.primary }]}>
                        {t("market.buyNow")}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ))}
          </>
        )}

        {activeTab === "gifts" && (
          <>
            <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.heroSection}>
              <LinearGradient colors={["#FF6B6B", "#FF1744"]} style={styles.crownIcon}>
                <Feather name="gift" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.heroTitle, { color: colors.text.primary }]}>{t("market.giftStore")}</Text>
              <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
                {t("market.giftStoreSubtitle")}
              </Text>
              <Pressable
                onPress={() => setActiveTab("coins")}
                style={styles.currentCoinBadge}
              >
                <Feather name="circle" size={14} color="#FFD700" />
                <Text style={[styles.currentCoinText, { color: isDark ? "#FFFFFF" : Colors.text.primary }]}>{coins} coin</Text>
                <Feather name="plus-circle" size={13} color={Colors.accent} />
              </Pressable>
            </Animated.View>

            <View style={styles.giftsGrid}>
              {GIFTS.map((gift, i) => (
                <Animated.View
                  key={gift.id}
                  entering={FadeInDown.delay(60 + i * 40).springify().damping(18)}
                  style={styles.giftItemWrapper}
                >
                  <Pressable
                    onPress={() => handleGiftPurchase(gift.id)}
                    style={({ pressed }) => [styles.giftItem, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.75)" }, pressed && { opacity: 0.85 }]}
                  >
                    <Image source={GIFT_IMAGES[gift.imageKey]} style={styles.giftItemImg} resizeMode="contain" />
                    <Text style={[styles.giftItemName, { color: colors.text.primary }]}>{gift.name}</Text>
                    <View style={styles.giftItemPrice}>
                      <Feather name="circle" size={10} color="#FFD700" />
                      <Text style={[styles.giftItemPriceText, { color: isDark ? "#FFFFFF" : colors.text.secondary }]}>{gift.price}</Text>
                    </View>
                    {getInventoryCount(gift.id) > 0 && (
                      <View style={styles.ownedBadge}>
                        <Text style={styles.ownedBadgeText}>{getInventoryCount(gift.id)}</Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              ))}
            </View>

            <View style={styles.inventoryNote}>
              <Feather name="info" size={14} color={Colors.text.tertiary} />
              <Text style={[styles.inventoryNoteText, { color: isDark ? "#FFFFFF" : Colors.text.secondary }]}>
                {t("market.inventoryNote")}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  coinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,215,0,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  coinChipText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#1D1D1F",
  },
  tabBtnTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  crownIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 21,
  },
  currentCoinBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,215,0,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
  },
  currentCoinText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.4,
    marginBottom: 4,
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
  coinCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 6,
  },
  coinCardGrad: {
    padding: 18,
    gap: 12,
    borderRadius: 20,
  },
  popularCoinChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  popularCoinText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  coinCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  coinAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  coinAmount: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  bonusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bonusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  coinCardPrice: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    letterSpacing: -0.3,
  },
  coinBuyBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  coinBuyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  giftsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  giftItemWrapper: {
    width: "22%",
  },
  giftItem: {
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    position: "relative",
  },
  giftItemRare: {
    borderColor: "rgba(79,195,247,0.4)",
    backgroundColor: "rgba(79,195,247,0.06)",
  },
  giftItemImg: {
    width: 52,
    height: 52,
  },
  giftItemName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.1,
  },
  giftItemPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  giftItemPriceText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.text.secondary,
  },
  ownedBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  ownedBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  rareBadge: {
    position: "absolute",
    top: -4,
    left: "50%",
    transform: [{ translateX: -20 }],
    backgroundColor: "#4FC3F7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  rareBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  inventoryNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  inventoryNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    lineHeight: 17,
  },
});
