import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useGifts, GIFTS, GIFT_IMAGES, type GiftItem } from "@/contexts/GiftContext";
import Colors from "@/constants/colors";

const { height: SCREEN_H } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  onSendGift: (giftId: string) => void;
}

function GiftCard({
  gift,
  onBuy,
  onSend,
  inventoryCount,
  coins,
  selected,
  onSelect,
}: {
  gift: GiftItem;
  onBuy: () => void;
  onSend: () => void;
  inventoryCount: number;
  coins: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const canAfford = coins >= gift.price;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      style={({ pressed }) => [
        styles.giftCard,
        selected && styles.giftCardSelected,
        pressed && { opacity: 0.88 },
      ]}
    >
      <Image source={GIFT_IMAGES[gift.imageKey]} style={styles.giftIconImg} resizeMode="contain" />
      <Text style={styles.giftCardName}>{gift.name}</Text>
      <View style={styles.giftPriceRow}>
        <Feather name="circle" size={10} color="#FFD700" />
        <Text style={styles.giftPrice}>{gift.price}</Text>
      </View>
      {inventoryCount > 0 && (
        <View style={styles.inventoryBadge}>
          <Text style={styles.inventoryBadgeText}>{inventoryCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function GiftSheet({ visible, onClose, onSendGift }: Props) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const { coins, inventory, purchaseGift, sendGift, getInventoryCount, addCoins } = useGifts();
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [tab, setTab] = useState<"store" | "inventory">("store");

  useEffect(() => {
    if (visible) {
      setSelectedGiftId(null);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleBuy = async (giftId: string) => {
    const gift = GIFTS.find((g) => g.id === giftId);
    if (!gift) return;
    if (coins < gift.price) {
      Alert.alert(
        "Yetersiz Coin",
        "Hediye almak için yeterli coin'in yok. Market'ten coin satın alabilirsin.",
        [
          { text: "İptal", style: "cancel" },
          {
            text: "Coin Al",
            onPress: () => {
              onClose();
              router.push({ pathname: "/(tabs)/market", params: { tab: "coins" } });
            },
          },
        ]
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ok = await purchaseGift(giftId);
    if (ok) {
      setSelectedGiftId(giftId);
      setTab("inventory");
    }
  };

  const handleSend = async () => {
    if (!selectedGiftId) return;
    const count = getInventoryCount(selectedGiftId);
    if (count <= 0) {
      Alert.alert("Envanter Boş", "Önce bu hediyeyi satın alman gerekiyor.");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const ok = await sendGift(selectedGiftId);
    if (ok) {
      onSendGift(selectedGiftId);
      onClose();
    }
  };

  const inventoryGifts = GIFTS.filter((g) => getInventoryCount(g.id) > 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={StyleSheet.absoluteFill}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
          )}
        </View>
      </Pressable>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        <View style={styles.sheetInner}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Pressable
              onPress={() => {
                onClose();
                router.push({ pathname: "/(tabs)/market", params: { tab: "coins" } });
              }}
              style={styles.coinBalance}
            >
              <Feather name="circle" size={14} color="#FFD700" />
              <Text style={styles.coinText}>{coins}</Text>
              <Feather name="plus-circle" size={14} color={Colors.accent} />
            </Pressable>

            <Text style={styles.sheetTitle}>Hediye Gönder</Text>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={17} color={Colors.text.secondary} />
            </Pressable>
          </View>

          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setTab("store")}
              style={[styles.tabBtn, tab === "store" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, tab === "store" && styles.tabBtnTextActive]}>
                Mağaza
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setTab("inventory")}
              style={[styles.tabBtn, tab === "inventory" && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, tab === "inventory" && styles.tabBtnTextActive]}>
                Envanter
              </Text>
              {inventoryGifts.length > 0 && (
                <View style={styles.inventoryDot} />
              )}
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.giftGrid}
            showsVerticalScrollIndicator={false}
          >
            {tab === "store" ? (
              GIFTS.map((gift) => (
                <GiftCard
                  key={gift.id}
                  gift={gift}
                  onBuy={() => handleBuy(gift.id)}
                  onSend={handleSend}
                  inventoryCount={getInventoryCount(gift.id)}
                  coins={coins}
                  selected={selectedGiftId === gift.id}
                  onSelect={() => setSelectedGiftId(gift.id)}
                />
              ))
            ) : inventoryGifts.length === 0 ? (
              <View style={styles.emptyInventory}>
                <Feather name="package" size={28} color={Colors.text.tertiary} />
                <Text style={styles.emptyInventoryText}>Envanteriniz boş</Text>
                <Text style={styles.emptyInventorySub}>Mağazadan hediye satın al</Text>
                <Pressable onPress={() => setTab("store")} style={styles.goStoreBtn}>
                  <Text style={styles.goStoreBtnText}>Mağazaya Git</Text>
                </Pressable>
              </View>
            ) : (
              inventoryGifts.map((gift) => (
                <GiftCard
                  key={gift.id}
                  gift={gift}
                  onBuy={() => handleBuy(gift.id)}
                  onSend={handleSend}
                  inventoryCount={getInventoryCount(gift.id)}
                  coins={coins}
                  selected={selectedGiftId === gift.id}
                  onSelect={() => setSelectedGiftId(gift.id)}
                />
              ))
            )}
          </ScrollView>

          {selectedGiftId && tab === "store" && getInventoryCount(selectedGiftId) === 0 ? (
            <Pressable
              onPress={() => handleBuy(selectedGiftId)}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient
                colors={["#FFD700", "#FF9500"]}
                style={styles.actionBtnGrad}
              >
                <Feather name="shopping-bag" size={17} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {coins >= (GIFTS.find((g) => g.id === selectedGiftId)?.price ?? 0)
                    ? `Satın Al — ${GIFTS.find((g) => g.id === selectedGiftId)?.price} Coin`
                    : "Yetersiz Coin"}
                </Text>
              </LinearGradient>
            </Pressable>
          ) : selectedGiftId && getInventoryCount(selectedGiftId) > 0 ? (
            <Pressable
              onPress={handleSend}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient
                colors={[Colors.userBubble.from, Colors.userBubble.to]}
                style={styles.actionBtnGrad}
              >
                <Feather name="send" size={17} color="#fff" />
                <Text style={styles.actionBtnText}>Gönder</Text>
              </LinearGradient>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.78,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetInner: {
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  handle: {
    width: 40,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  coinBalance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,215,0,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  coinText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F5F5F7",
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
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
  inventoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF3B30",
  },
  scroll: {
    maxHeight: SCREEN_H * 0.4,
  },
  giftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 10,
    paddingBottom: 8,
  },
  giftCard: {
    width: "22%",
    alignItems: "center",
    gap: 5,
    padding: 10,
    borderRadius: 16,
    backgroundColor: "#F5F5F7",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  giftCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(0,122,255,0.06)",
  },
  giftIconImg: {
    width: 46,
    height: 46,
  },
  giftCardName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.1,
  },
  giftPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  giftPrice: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.text.secondary,
  },
  inventoryBadge: {
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
  inventoryBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  emptyInventory: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyInventoryText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  emptyInventorySub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
  },
  goStoreBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(0,122,255,0.1)",
  },
  goStoreBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
  actionBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  actionBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: -0.2,
  },
});
