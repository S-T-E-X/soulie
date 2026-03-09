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
import { useGifts, GIFTS, COIN_PACKAGES } from "@/contexts/GiftContext";

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

export default function MarketScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { tab: initialTab } = useLocalSearchParams<{ tab?: string }>();
  const { coins, purchaseGift, getInventoryCount, addCoins } = useGifts();
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addCoins(pkg.coins + (pkg.bonus ?? 0));
    Alert.alert(
      "Coin Eklendi",
      `${pkg.coins + (pkg.bonus ?? 0)} coin hesabına eklendi!`,
      [{ text: "Harika" }]
    );
  };

  const handleGiftPurchase = (giftId: string) => {
    const gift = GIFTS.find((g) => g.id === giftId);
    if (!gift) return;
    if (coins < gift.price) {
      Alert.alert(
        "Yetersiz Coin",
        `Bu hediye için ${gift.price} coin gerekiyor. Şu an ${coins} coin'in var.`,
        [
          { text: "İptal", style: "cancel" },
          { text: "Coin Al", onPress: () => setActiveTab("coins") },
        ]
      );
      return;
    }
    Alert.alert(
      `${gift.name} Satın Al`,
      `${gift.price} coin karşılığında 1 adet ${gift.name} satın almak istiyor musun?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Satın Al",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await purchaseGift(giftId);
            Alert.alert("Başarılı", `${gift.name} envanterine eklendi!`);
          },
        },
      ]
    );
  };

  return (
    <BackgroundGradient>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>Market</Text>
        <Pressable
          onPress={() => setActiveTab("coins")}
          style={({ pressed }) => [styles.coinChip, pressed && { opacity: 0.8 }]}
        >
          <Feather name="circle" size={14} color="#FFD700" />
          <Text style={styles.coinChipText}>{coins}</Text>
          <Feather name="plus" size={13} color={Colors.accent} />
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {(["premium", "gifts", "coins"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab);
            }}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === "premium" ? "Premium" : tab === "gifts" ? "Hediyeler" : "Coin"}
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
              <Text style={styles.heroTitle}>Soulie Premium</Text>
              <Text style={styles.heroSubtitle}>
                En iyi AI arkadaşlık deneyimi için{"\n"}premium'a geç
              </Text>
            </Animated.View>

            <Text style={styles.sectionTitle}>Plan Seç</Text>

            {PLANS.map((plan, i) => (
              <Animated.View
                key={plan.id}
                entering={FadeInDown.delay(80 + i * 60).springify().damping(18)}
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
                          <Text style={[styles.planPeriod, { color: plan.textColor, opacity: 0.7 }]}>{plan.period}</Text>
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
          </>
        )}

        {activeTab === "coins" && (
          <>
            <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.heroSection}>
              <LinearGradient colors={["#FFD700", "#FF9500"]} style={styles.crownIcon}>
                <Feather name="circle" size={22} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.heroTitle}>Coin Satın Al</Text>
              <Text style={styles.heroSubtitle}>
                Coinlerini harcayarak karakterlerine{"\n"}özel hediyeler gönder
              </Text>
              <View style={styles.currentCoinBadge}>
                <Feather name="circle" size={14} color="#FFD700" />
                <Text style={styles.currentCoinText}>{coins} coin mevcut</Text>
              </View>
            </Animated.View>

            <Text style={styles.sectionTitle}>Paketler</Text>

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
                    colors={pkg.isPopular ? ["#FFD700", "#FF9500"] : ["#F5F5F7", "#ECECEE"]}
                    style={styles.coinCardGrad}
                  >
                    {pkg.isPopular && (
                      <View style={styles.popularCoinChip}>
                        <Text style={styles.popularCoinText}>En Popüler</Text>
                      </View>
                    )}
                    <View style={styles.coinCardContent}>
                      <View style={styles.coinAmountRow}>
                        <Feather name="circle" size={22} color={pkg.isPopular ? "#fff" : "#FFD700"} />
                        <Text style={[styles.coinAmount, { color: pkg.isPopular ? "#fff" : Colors.text.primary }]}>
                          {(pkg.coins + (pkg.bonus ?? 0)).toLocaleString()}
                        </Text>
                        {pkg.bonus ? (
                          <View style={[styles.bonusChip, { backgroundColor: pkg.isPopular ? "rgba(255,255,255,0.25)" : "rgba(0,122,255,0.1)" }]}>
                            <Text style={[styles.bonusText, { color: pkg.isPopular ? "#fff" : Colors.accent }]}>
                              +{pkg.bonus} bonus
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.coinCardPrice, { color: pkg.isPopular ? "#fff" : Colors.text.secondary }]}>
                        {pkg.price}
                      </Text>
                    </View>
                    <View style={[styles.coinBuyBtn, { backgroundColor: pkg.isPopular ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.06)" }]}>
                      <Text style={[styles.coinBuyBtnText, { color: pkg.isPopular ? "#fff" : Colors.text.primary }]}>
                        Satın Al
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
              <Text style={styles.heroTitle}>Hediye Mağazası</Text>
              <Text style={styles.heroSubtitle}>
                Karakterlerine özel hediyeler al,{"\n"}sohbetten gönder
              </Text>
              <Pressable
                onPress={() => setActiveTab("coins")}
                style={styles.currentCoinBadge}
              >
                <Feather name="circle" size={14} color="#FFD700" />
                <Text style={styles.currentCoinText}>{coins} coin</Text>
                <Feather name="plus-circle" size={13} color={Colors.accent} />
              </Pressable>
            </Animated.View>

            <Text style={styles.sectionTitle}>Temel Hediyeler</Text>
            <View style={styles.giftsGrid}>
              {GIFTS.filter((g) => g.category === "basic").map((gift, i) => (
                <Animated.View
                  key={gift.id}
                  entering={FadeInDown.delay(60 + i * 40).springify().damping(18)}
                  style={styles.giftItemWrapper}
                >
                  <Pressable
                    onPress={() => handleGiftPurchase(gift.id)}
                    style={({ pressed }) => [styles.giftItem, pressed && { opacity: 0.85 }]}
                  >
                    <LinearGradient colors={[gift.colorFrom, gift.colorTo]} style={styles.giftItemIcon}>
                      <Feather name={gift.icon as any} size={24} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.giftItemName}>{gift.name}</Text>
                    <View style={styles.giftItemPrice}>
                      <Feather name="circle" size={10} color="#FFD700" />
                      <Text style={styles.giftItemPriceText}>{gift.price}</Text>
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

            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Premium Hediyeler</Text>
            <View style={styles.giftsGrid}>
              {GIFTS.filter((g) => g.category === "premium" || g.category === "rare").map((gift, i) => (
                <Animated.View
                  key={gift.id}
                  entering={FadeInDown.delay(100 + i * 40).springify().damping(18)}
                  style={styles.giftItemWrapper}
                >
                  <Pressable
                    onPress={() => handleGiftPurchase(gift.id)}
                    style={({ pressed }) => [styles.giftItem, gift.category === "rare" && styles.giftItemRare, pressed && { opacity: 0.85 }]}
                  >
                    {gift.category === "rare" && (
                      <View style={styles.rareBadge}>
                        <Text style={styles.rareBadgeText}>Nadir</Text>
                      </View>
                    )}
                    <LinearGradient colors={[gift.colorFrom, gift.colorTo]} style={styles.giftItemIcon}>
                      <Feather name={gift.icon as any} size={24} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.giftItemName}>{gift.name}</Text>
                    <View style={styles.giftItemPrice}>
                      <Feather name="circle" size={10} color="#FFD700" />
                      <Text style={styles.giftItemPriceText}>{gift.price}</Text>
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
              <Text style={styles.inventoryNoteText}>
                Satın aldığın hediyeler envanterinde bekler. Sohbet sırasında hediye ikonuna basarak gönderebilirsin.
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
    color: Colors.text.secondary,
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
  giftItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
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
