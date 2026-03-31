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
  Linking,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import Colors from "@/constants/colors";
import { useGifts, GIFTS, GIFT_IMAGES } from "@/contexts/GiftContext";
import { Image } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/hooks/useI18n";
import {
  useSubscription,
  REVENUECAT_VIP_ENTITLEMENT,
  REVENUECAT_VIP_OFFERING,
  REVENUECAT_COINS_OFFERING,
} from "@/lib/revenuecat";

const ALL_FEAT_KEYS = [
  "market.featAllChars",
  "market.featUnlimitedMessages",
  "market.featPremiumFeatures",
  "market.featPrioritySupport",
  "market.featVoiceChat",
  "market.featUnlimitedTarot",
  "market.featCustomChar",
];

const PLAN_PACKAGE_KEYS = [
  { key: "$rc_weekly", gradient: [Colors.userBubble.from, Colors.userBubble.to] as [string, string], textColor: "#FFFFFF", isPopular: false, periodKey: "market.perWeek", nameKey: "market.weekly", badge: null as string | null, fallbackPrice: "$4.99" },
  { key: "$rc_monthly", gradient: ["#1D1D1F", "#3A3A3C"] as [string, string], textColor: "#FFFFFF", isPopular: true, periodKey: "market.perMonth", nameKey: "market.monthly", badge: "market.discount30" as string | null, fallbackPrice: "$14.99" },
  { key: "$rc_annual", gradient: ["#2D0654", "#6B21A8"] as [string, string], textColor: "#FFFFFF", isPopular: false, periodKey: "market.perYear", nameKey: "market.yearly", badge: "market.discount55" as string | null, fallbackPrice: "$79.99" },
];

const COIN_PACKAGE_KEYS = ["coins_100", "coins_550", "coins_1400", "coins_3750", "coins_12000"];
const COIN_PACKAGE_META: Record<string, { coins: number; bonus?: number; isPopular?: boolean; fallbackPrice: string }> = {
  coins_100: { coins: 100, fallbackPrice: "$0.99" },
  coins_550: { coins: 550, fallbackPrice: "$3.99" },
  coins_1400: { coins: 1400, fallbackPrice: "$6.99" },
  coins_3750: { coins: 3750, fallbackPrice: "$12.99" },
  coins_12000: { coins: 12000, bonus: 0, isPopular: true, fallbackPrice: "$24.99" },
};

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
  const { coins, addCoins, purchaseGift, getInventoryCount } = useGifts();
  const { isDark, colors } = useTheme();
  const { user, isVipActive } = useAuth();
  const { t } = useI18n();
  const { isVip, isPurchasing, purchaseById, restore } = useSubscription();

  const validTabs = ["premium", "gifts", "coins"] as const;
  const [activeTab, setActiveTab] = useState<"premium" | "gifts" | "coins">(
    validTabs.includes(initialTab as any) ? (initialTab as any) : "premium"
  );

  const [purchasing, setPurchasing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  React.useEffect(() => {
    if (validTabs.includes(initialTab as any)) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  const handleVipPress = async (meta: typeof PLAN_PACKAGE_KEYS[number]) => {
    if (isVip || isVipActive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);
    try {
      await purchaseById({ packageId: meta.key, offeringId: REVENUECAT_VIP_OFFERING });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMsg(t("market.purchaseSuccess"));
    } catch (e: any) {
      if (e?.userCancelled === true || e?.code === 1 || e?.code === "1" || e?.message === "USER_CANCELLED") {
        setPurchasing(false);
        return;
      }
      const errorMsg = `Code: ${e?.code}\nMessage: ${e?.message}\nUnderlyingError: ${e?.underlyingErrorMessage || "N/A"}`;
      console.warn("[Market] VIP purchase error:", errorMsg);
      Alert.alert(t("market.purchaseError"), errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  const handleCoinPress = async (packageId: string, meta: typeof COIN_PACKAGE_META[string]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPurchasing(true);
    const total = meta.coins + (meta.bonus ?? 0);
    try {
      await purchaseById({ packageId, offeringId: REVENUECAT_COINS_OFFERING });
      await addCoins(total);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMsg(t("market.coinSuccess").replace("{count}", String(total)));
    } catch (e: any) {
      if (e?.userCancelled === true || e?.code === 1 || e?.code === "1" || e?.message === "USER_CANCELLED") {
        setPurchasing(false);
        return;
      }
      const errorMsg = `Code: ${e?.code}\nMessage: ${e?.message}\nUnderlyingError: ${e?.underlyingErrorMessage || "N/A"}`;
      console.warn("[Market] Coin purchase error:", errorMsg);
      Alert.alert(t("market.purchaseError"), errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  const handleGiftPurchase = (giftId: string) => {
    const gift = GIFTS.find((g) => g.id === giftId);
    if (!gift) return;
    if (coins < gift.price) {
      setActiveTab("coins");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    purchaseGift(giftId);
  };

  const handleRestore = async () => {
    try {
      await restore();
      setSuccessMsg(t("market.restoreSuccess"));
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch {
      setSuccessMsg(t("market.restoreFail"));
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  return (
    <BackgroundGradient>
      <StatusBar barStyle={colors.statusBar} />

      {successMsg !== "" && (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>{successMsg}</Text>
        </View>
      )}


      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>{t("market.title")}</Text>
        <Pressable
          onPress={() => setActiveTab("coins")}
          style={({ pressed }) => [
            styles.coinChip,
            { backgroundColor: isDark ? "rgba(255,215,0,0.15)" : "rgba(255,215,0,0.1)" },
            pressed && { opacity: 0.8 },
          ]}
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
            <Text style={[
              styles.tabBtnText,
              { color: activeTab === tab ? "#fff" : (isDark ? "rgba(255,255,255,0.7)" : "#1D1D1F") },
              activeTab === tab && styles.tabBtnTextActive,
            ]}>
              {tab === "premium" ? t("market.premium") : tab === "gifts" ? t("market.gifts") : t("market.coins")}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: 16, paddingBottom: insets.bottom + 100 }]}
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
              {(isVip || isVipActive) && (
                <View style={styles.activeVipBadge}>
                  <Feather name="check-circle" size={14} color="#22c55e" />
                  <Text style={styles.activeVipText}>{t("market.vipActive")}</Text>
                </View>
              )}
            </Animated.View>

            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t("market.choosePlan")}</Text>

            {PLAN_PACKAGE_KEYS.map((meta, i) => (
              <Animated.View key={meta.key} entering={FadeInDown.delay(80 + i * 60).springify().damping(18)}>
                <Pressable
                  onPress={() => handleVipPress(meta)}
                  style={({ pressed }) => [styles.planCard, pressed && { opacity: 0.85 }]}
                >
                  <LinearGradient colors={meta.gradient} style={styles.planGradient}>
                    {meta.badge ? (
                      <View style={styles.badgeChip}>
                        <Text style={styles.badgeText}>{t(meta.badge as any)}</Text>
                      </View>
                    ) : null}
                    {meta.isPopular ? (
                      <View style={styles.popularChip}>
                        <Text style={styles.popularText}>{t("market.mostPopular")}</Text>
                      </View>
                    ) : null}
                    <View style={styles.planHeader}>
                      <View>
                        <Text style={[styles.planName, { color: meta.textColor }]}>{t(meta.nameKey as any)}</Text>
                        <View style={styles.priceRow}>
                          <Text style={[styles.planPrice, { color: meta.textColor }]}>
                            {meta.fallbackPrice}
                          </Text>
                          <Text style={[styles.planPeriod, { color: meta.textColor, opacity: 0.7 }]}>
                            {t(meta.periodKey as any)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.featuresList}>
                      {ALL_FEAT_KEYS.map((featKey) => (
                        <View key={featKey} style={styles.featRow}>
                          <Feather name="check" size={13} color="rgba(255,255,255,0.9)" />
                          <Text style={[styles.featRowText, { color: meta.textColor, opacity: 0.9 }]}>
                            {t(featKey as any)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.selectButton, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                      <Text style={[styles.selectButtonText, { color: meta.textColor }]}>
                        {isVip || isVipActive ? t("market.activeBtn") : meta.isPopular ? t("market.start") : t("market.select")}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ))}

            <Pressable onPress={handleRestore} style={styles.restoreBtn}>
              <Text style={styles.restoreBtnText}>{t("settings.restorePurchases")}</Text>
            </Pressable>

            <Text style={styles.legalText}>{t("market.cancelAnytime")}</Text>
            <Text style={styles.legalText}>{t("market.legalNote")}</Text>
            <View style={styles.legalLinks}>
              <Pressable onPress={() => Linking.openURL("https://soulie.app/terms")}>
                <Text style={styles.legalLink}>{t("market.termsOfUse")}</Text>
              </Pressable>
              <Text style={styles.legalSep}>·</Text>
              <Pressable onPress={() => Linking.openURL("https://soulie.app/privacy")}>
                <Text style={styles.legalLink}>{t("market.privacyPolicy")}</Text>
              </Pressable>
            </View>
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
                <Text style={[styles.currentCoinText, { color: isDark ? "#FFFFFF" : Colors.text.primary }]}>
                  {t("market.currentCoins", { count: coins })}
                </Text>
              </View>
            </Animated.View>

            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>{t("market.packages")}</Text>

            {COIN_PACKAGE_KEYS.map((key, i) => {
              const meta = COIN_PACKAGE_META[key];
              return (
              <Animated.View key={key} entering={FadeInDown.delay(80 + i * 60).springify().damping(18)}>
                <Pressable
                  onPress={() => handleCoinPress(key, meta)}
                  style={({ pressed }) => [styles.coinCard, pressed && { opacity: 0.85 }]}
                >
                  <LinearGradient
                    colors={meta.isPopular ? ["#FFD700", "#FF9500"] : (isDark ? ["#1C1C2E", "#2A2A42"] : ["#F5F5F7", "#ECECEE"])}
                    style={styles.coinCardGrad}
                  >
                    {meta.isPopular && (
                      <View style={styles.popularCoinChip}>
                        <Text style={styles.popularCoinText}>{t("market.popular")}</Text>
                      </View>
                    )}
                    <View style={styles.coinCardContent}>
                      <View style={styles.coinAmountRow}>
                        <Feather name="circle" size={22} color={meta.isPopular ? "#fff" : "#FFD700"} />
                        <Text style={[styles.coinAmount, { color: meta.isPopular ? "#fff" : colors.text.primary }]}>
                          {(meta.coins + (meta.bonus ?? 0)).toLocaleString()}
                        </Text>
                        {(meta.bonus ?? 0) > 0 && (
                          <View style={[styles.bonusChip, { backgroundColor: meta.isPopular ? "rgba(255,255,255,0.25)" : "rgba(0,122,255,0.1)" }]}>
                            <Text style={[styles.bonusText, { color: meta.isPopular ? "#fff" : colors.accent }]}>
                              +{meta.bonus} bonus
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.coinCardPrice, { color: meta.isPopular ? "#fff" : colors.text.secondary }]}>
                        {meta.fallbackPrice}
                      </Text>
                    </View>
                    <View style={[styles.coinBuyBtn, { backgroundColor: meta.isPopular ? "rgba(255,255,255,0.25)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }]}>
                      <Text style={[styles.coinBuyBtnText, { color: meta.isPopular ? "#fff" : colors.text.primary }]}>
                        {t("market.buyNow")}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
              );
            })}
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
              <Pressable onPress={() => setActiveTab("coins")} style={styles.currentCoinBadge}>
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
                    style={({ pressed }) => [
                      styles.giftItem,
                      { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.75)" },
                      pressed && { opacity: 0.85 },
                    ]}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  coinChipText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
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
    alignItems: "center",
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  tabBtnTextActive: {
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
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  activeVipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
  },
  activeVipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#22c55e",
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
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
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
  restoreBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  restoreBtnText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
    textDecorationLine: "underline",
  },
  legalText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  legalLink: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
    textDecorationLine: "underline",
  },
  legalSep: {
    fontSize: 11,
    color: Colors.text.tertiary,
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
  },
  giftItemWrapper: {
    width: "30%",
  },
  giftItem: {
    borderRadius: 16,
    padding: 10,
    alignItems: "center",
    gap: 6,
  },
  giftItemImg: {
    width: 56,
    height: 56,
  },
  giftItemName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  giftItemPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  giftItemPriceText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  ownedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  ownedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  inventoryNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  inventoryNoteText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  successBanner: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 100,
  },
  successBannerText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
