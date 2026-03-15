import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  Platform,
  Modal,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import { fetch as expoFetch } from "expo/fetch";
import { useI18n } from "@/hooks/useI18n";

const { width: SCREEN_W } = Dimensions.get("window");
const STORAGE_KEY = "soulie_tarot_v2";
const DISPLAY_CARD_COUNT = 12;

type ArcanaType = "Major" | "Minor";
type LifeCategory = "love" | "career" | "destiny" | "warning" | "growth" | "spiritual";
type SpreadType = "single" | "three" | "five";

type TarotCard = {
  id: string;
  name: string;
  nameEn: string;
  arcana: ArcanaType;
  energy: string;
  category: LifeCategory;
  meaningUpright: string;
  meaningReversed: string;
  gradient: [string, string];
  icon: string;
  isRare?: boolean;
};

const TAROT_DECK: TarotCard[] = [
  { id: "fool", name: "Deli", nameEn: "The Fool", arcana: "Major", energy: "yeni başlangıçlar", category: "destiny", meaningUpright: "Özgürlük, yeni bir yolculuk, saf potansiyel", meaningReversed: "Düşüncesizlik, riskli kararlar", gradient: ["#667eea", "#764ba2"], icon: "star" },
  { id: "magician", name: "Büyücü", nameEn: "The Magician", arcana: "Major", energy: "yaratıcılık", category: "career", meaningUpright: "Güç, yetenek, ustalık", meaningReversed: "Manipülasyon, beceriksizlik", gradient: ["#f093fb", "#f5576c"], icon: "zap", isRare: true },
  { id: "priestess", name: "Başrahibe", nameEn: "High Priestess", arcana: "Major", energy: "sezgi", category: "spiritual", meaningUpright: "Sezgi, gizem, bilinçaltı", meaningReversed: "Gizli gündemler, yüzeysellik", gradient: ["#4facfe", "#00f2fe"], icon: "moon", isRare: true },
  { id: "empress", name: "İmparatoriçe", nameEn: "The Empress", arcana: "Major", energy: "bereket", category: "love", meaningUpright: "Bereket, doğurganlık, güzellik", meaningReversed: "Bağımlılık, boşluk", gradient: ["#43e97b", "#38f9d7"], icon: "heart" },
  { id: "emperor", name: "İmparator", nameEn: "The Emperor", arcana: "Major", energy: "otorite", category: "career", meaningUpright: "Yapı, düzen, liderlik", meaningReversed: "Tiranlık, katılık", gradient: ["#fa709a", "#fee140"], icon: "shield" },
  { id: "hierophant", name: "Hiyerofant", nameEn: "The Hierophant", arcana: "Major", energy: "bilgelik", category: "spiritual", meaningUpright: "Gelenek, rehberlik, öğreti", meaningReversed: "Dogmatizm, uyumsuzluk", gradient: ["#a18cd1", "#fbc2eb"], icon: "book" },
  { id: "lovers", name: "Aşıklar", nameEn: "The Lovers", arcana: "Major", energy: "aşk", category: "love", meaningUpright: "Birlik, tutku, uyum", meaningReversed: "Dengesizlik, yanlış seçim", gradient: ["#ff9a9e", "#fad0c4"], icon: "heart", isRare: true },
  { id: "chariot", name: "Savaş Arabası", nameEn: "The Chariot", arcana: "Major", energy: "zafer", category: "career", meaningUpright: "Kararlılık, zafer, kontrol", meaningReversed: "Saldırganlık, yön kaybı", gradient: ["#30cfd0", "#330867"], icon: "navigation" },
  { id: "strength", name: "Güç", nameEn: "Strength", arcana: "Major", energy: "cesaret", category: "growth", meaningUpright: "İç güç, cesaret, sabır", meaningReversed: "Güvensizlik, zayıflık", gradient: ["#f77062", "#fe5196"], icon: "award" },
  { id: "hermit", name: "Ermiş", nameEn: "The Hermit", arcana: "Major", energy: "içe dönüş", category: "spiritual", meaningUpright: "Yalnızlık, arayış, bilgelik", meaningReversed: "İzolasyon, kaçış", gradient: ["#96fbc4", "#f9f586"], icon: "eye" },
  { id: "wheel", name: "Kader Çarkı", nameEn: "Wheel of Fortune", arcana: "Major", energy: "değişim", category: "destiny", meaningUpright: "Şans, kader, dönüm noktası", meaningReversed: "Kötü şans, direnç", gradient: ["#fddb92", "#d1fdff"], icon: "refresh-cw", isRare: true },
  { id: "justice", name: "Adalet", nameEn: "Justice", arcana: "Major", energy: "denge", category: "career", meaningUpright: "Adalet, dürüstlük, denge", meaningReversed: "Haksızlık, taraf tutma", gradient: ["#89f7fe", "#66a6ff"], icon: "sliders" },
  { id: "hangedman", name: "Asılan Adam", nameEn: "The Hanged Man", arcana: "Major", energy: "fedakarlık", category: "growth", meaningUpright: "Teslim olmak, yeni bakış açısı", meaningReversed: "Erteleme, direniş", gradient: ["#c471f5", "#fa71cd"], icon: "rotate-ccw" },
  { id: "death", name: "Ölüm", nameEn: "Death", arcana: "Major", energy: "dönüşüm", category: "destiny", meaningUpright: "Son ve yeni başlangıç, dönüşüm", meaningReversed: "Değişime direnç, durgunluk", gradient: ["#2c3e50", "#4ca1af"], icon: "sunset", isRare: true },
  { id: "temperance", name: "Denge", nameEn: "Temperance", arcana: "Major", energy: "uyum", category: "growth", meaningUpright: "Sabır, denge, ılımlılık", meaningReversed: "Aşırılık, dengesizlik", gradient: ["#c2e59c", "#64b3f4"], icon: "droplet" },
  { id: "devil", name: "Şeytan", nameEn: "The Devil", arcana: "Major", energy: "bağımlılık", category: "warning", meaningUpright: "Bağımlılık, tutku, gölge benlik", meaningReversed: "Özgürleşme, farkındalık", gradient: ["#434343", "#000000"], icon: "alert-triangle", isRare: true },
  { id: "tower", name: "Kule", nameEn: "The Tower", arcana: "Major", energy: "yıkım", category: "warning", meaningUpright: "Ani değişim, yıkım, uyanış", meaningReversed: "Felaketin eşiği, kaçış", gradient: ["#c33764", "#1d2671"], icon: "cloud-lightning" },
  { id: "star", name: "Yıldız", nameEn: "The Star", arcana: "Major", energy: "umut", category: "spiritual", meaningUpright: "Umut, ilham, iç huzur", meaningReversed: "Umutsuzluk, inanç kaybı", gradient: ["#a1c4fd", "#c2e9fb"], icon: "star", isRare: true },
  { id: "moon", name: "Ay", nameEn: "The Moon", arcana: "Major", energy: "illüzyon", category: "warning", meaningUpright: "Bilinçaltı, rüyalar, yanılsama", meaningReversed: "Korkuların üstesinden gelme", gradient: ["#0f2027", "#2c5364"], icon: "moon" },
  { id: "sun", name: "Güneş", nameEn: "The Sun", arcana: "Major", energy: "neşe", category: "love", meaningUpright: "Mutluluk, başarı, canlılık", meaningReversed: "Geçici mutluluk, kibir", gradient: ["#f7971e", "#ffd200"], icon: "sun" },
  { id: "judgement", name: "Mahkeme", nameEn: "Judgement", arcana: "Major", energy: "uyanış", category: "destiny", meaningUpright: "Yeniden doğuş, içsel çağrı", meaningReversed: "Kendinden şüphe, kaçış", gradient: ["#e44d26", "#f16529"], icon: "bell" },
  { id: "world", name: "Dünya", nameEn: "The World", arcana: "Major", energy: "tamamlanma", category: "destiny", meaningUpright: "Bütünlük, başarı, döngü sonu", meaningReversed: "Eksiklik, tamamlanmamışlık", gradient: ["#11998e", "#38ef7d"], icon: "globe", isRare: true },
];

const CATEGORY_COLORS: Record<LifeCategory, string> = {
  love: "#FF6B9D", career: "#007AFF", destiny: "#FFD700", warning: "#FF3B30", growth: "#34C759", spiritual: "#AF52DE",
};

function getTodayKey() { return new Date().toISOString().split("T")[0]; }

async function getTarotData(): Promise<{ lastRead: string; streak: number; totalReadings: number; luckyCardId: string }> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastRead: "", streak: 0, totalReadings: 0, luckyCardId: "" };
    return JSON.parse(raw);
  } catch { return { lastRead: "", streak: 0, totalReadings: 0, luckyCardId: "" }; }
}

async function saveTarotData(data: any) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function getLuckyCard(): TarotCard {
  const seed = getTodayKey().split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return TAROT_DECK[seed % TAROT_DECK.length];
}

function shuffleDeck(): TarotCard[] {
  return [...TAROT_DECK].sort(() => Math.random() - 0.5);
}

function GlowDot({ delay, size = 3, color = "#C084FC" }: { delay: number; size?: number; color?: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1500 + delay * 200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1500 + delay * 200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.7] });
  return (
    <Animated.View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, top: `${15 + delay * 12}%`, left: `${10 + (delay * 37) % 80}%` }} />
  );
}

function PickableCardBack({ onPress, isSelected, index }: { onPress: () => void; isSelected: boolean; index: number }) {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const cardW = (SCREEN_W - 40 - 24) / 3;
  const cardH = cardW * 1.45;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (isSelected) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isSelected]);

  const scale = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const opacity = enterAnim;
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const selectedScale = isSelected ? 1.05 : 1;

  return (
    <Animated.View style={{ opacity, transform: [{ scale: Animated.multiply(enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }), new Animated.Value(selectedScale)) }] }}>
      <Pressable onPress={onPress}>
        <View style={{ width: cardW, height: cardH, alignItems: "center", justifyContent: "center" }}>
          {isSelected && (
            <Animated.View style={{
              position: "absolute",
              width: cardW + 6,
              height: cardH + 6,
              borderRadius: 16,
              backgroundColor: "#C084FC",
              shadowColor: "#C084FC",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 16,
              opacity: glowOpacity,
            }} />
          )}
          <LinearGradient
            colors={isSelected ? ["#2D1065", "#1A0A3E"] as const : ["#1A0A3E", "#0D0025"] as const}
            style={{
              width: cardW,
              height: cardH,
              borderRadius: 14,
              overflow: "hidden",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: isSelected ? 2 : 1.5,
              borderColor: isSelected ? "#C084FC" : "rgba(192,132,252,0.25)",
            }}
          >
            <View style={{ alignItems: "center", gap: 8 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isSelected ? "rgba(192,132,252,0.25)" : "rgba(192,132,252,0.1)",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isSelected ? "rgba(192,132,252,0.5)" : "rgba(192,132,252,0.2)",
              }}>
                <Feather
                  name={isSelected ? "check" : "eye"}
                  size={18}
                  color={isSelected ? "#C084FC" : "rgba(192,132,252,0.4)"}
                />
              </View>
              <View style={{ width: 24, height: 1, backgroundColor: isSelected ? "rgba(192,132,252,0.4)" : "rgba(192,132,252,0.15)" }} />
            </View>
            <View style={{
              position: "absolute",
              width: cardW - 10,
              height: cardH - 10,
              borderWidth: 1,
              borderColor: isSelected ? "rgba(192,132,252,0.3)" : "rgba(255,215,0,0.08)",
              borderRadius: 10,
            }} />
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function MysticalCardBack({ onPress, isActive, size }: { onPress: () => void; isActive: boolean; size: "sm" | "md" | "lg" }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const w = size === "lg" ? 140 : size === "md" ? 110 : 90;
  const h = size === "lg" ? 200 : size === "md" ? 165 : 135;

  useEffect(() => {
    if (isActive) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])).start();
    }
  }, [isActive]);

  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  return (
    <Pressable onPress={onPress}>
      <View style={{ width: w, height: h, alignItems: "center", justifyContent: "center" }}>
        {isActive && <Animated.View style={[styles.cardGlow, { width: w + 8, height: h + 8, borderRadius: 18, opacity: glowOpacity }]} />}
        <LinearGradient colors={["#1A0A3E", "#0D0025"]} style={[styles.cardBack, { width: w, height: h }]}>
          <View style={styles.cardBackInner}>
            <View style={styles.cardBackSymbol}>
              <Feather name="eye" size={24} color="rgba(192,132,252,0.5)" />
            </View>
            <View style={styles.cardBackLine} />
            {isActive && <Text style={styles.cardBackTap}>Dokun</Text>}
          </View>
          <View style={[styles.cardBackBorder, { width: w - 8, height: h - 8 }]} />
        </LinearGradient>
      </View>
    </Pressable>
  );
}

function RevealedCard({ card, position, reversed, size }: { card: TarotCard; position: string; reversed: boolean; size: "sm" | "md" | "lg" }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const w = size === "lg" ? 140 : size === "md" ? 110 : 90;
  const h = size === "lg" ? 200 : size === "md" ? 165 : 135;

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <View style={{ alignItems: "center", gap: 6 }}>
        <LinearGradient colors={card.gradient} style={[styles.revealedCard, { width: w, height: h }, card.isRare && styles.rareCard]}>
          {card.isRare && <View style={styles.rareBadge}><Text style={styles.rareBadgeText}>RARE</Text></View>}
          <View style={[styles.revealedIcon, { transform: [{ rotate: reversed ? "180deg" : "0deg" }] }]}>
            <Feather name={card.icon as any} size={size === "lg" ? 32 : 22} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={[styles.revealedName, size === "sm" && { fontSize: 10 }]} numberOfLines={1}>{card.name}</Text>
          <Text style={[styles.revealedNameEn, size === "sm" && { fontSize: 8 }]} numberOfLines={1}>{card.nameEn}</Text>
          {reversed && <Text style={styles.reversedLabel}>Ters</Text>}
          <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[card.category] + "40" }]}>
            <Text style={[styles.categoryText, { color: CATEGORY_COLORS[card.category] }]}>{categoryLabels[card.category]}</Text>
          </View>
        </LinearGradient>
        <Text style={styles.posLabel}>{position}</Text>
      </View>
    </Animated.View>
  );
}

export default function TarotScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { user, isVipActive } = useAuth();
  const { t } = useI18n();

  const spreadOptions = React.useMemo(() => [
    { type: "single" as SpreadType, label: t("tarot.single"), count: 1, icon: "square", desc: t("tarot.singleDesc") },
    { type: "three" as SpreadType, label: t("tarot.three"), count: 3, icon: "columns", desc: t("tarot.threeDesc") },
    { type: "five" as SpreadType, label: t("tarot.five"), count: 5, icon: "grid", desc: t("tarot.fiveDesc") },
  ], [t]);

  const positionLabels = React.useMemo((): Record<SpreadType, string[]> => ({
    single: [t("tarot.guidance")],
    three: [t("tarot.past"), t("tarot.present"), t("tarot.future")],
    five: [t("tarot.past"), t("tarot.recentPast"), t("tarot.present"), t("tarot.recentFuture"), t("tarot.outcome")],
  }), [t]);

  const categoryLabels = React.useMemo((): Record<LifeCategory, string> => ({
    love: t("tarot.love"),
    career: t("tarot.career"),
    destiny: t("tarot.destiny"),
    warning: t("tarot.warning"),
    growth: t("tarot.growth"),
    spiritual: t("tarot.spiritual"),
  }), [t]);

  const [phase, setPhase] = useState<"loading" | "select" | "picking" | "deck" | "reading" | "done">("loading");
  const [spread, setSpread] = useState<SpreadType>("three");
  const [displayDeck, setDisplayDeck] = useState<TarotCard[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [drawnCards, setDrawnCards] = useState<(TarotCard & { reversed: boolean })[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [alreadyRead, setAlreadyRead] = useState(false);
  const [interpretation, setInterpretation] = useState("");
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [tarotData, setTarotData] = useState<any>(null);
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [requiredCount, setRequiredCount] = useState(0);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);

  const luckyCard = getLuckyCard();

  useEffect(() => {
    (async () => {
      const data = await getTarotData();
      setTarotData(data);
      const today = getTodayKey();
      setAlreadyRead(data.lastRead === today);
      setPhase("select");
    })();
  }, []);

  const startReading = useCallback((type: SpreadType) => {
    const today = getTodayKey();
    if (isVipActive) {
      const usedToday: string[] = (tarotData?.lastRead === today ? tarotData?.vipUsedSpreads : null) ?? [];
      if (usedToday.includes(type)) {
        Alert.alert(t("tarot.spreadUsed"), t("tarot.spreadUsedMessage"));
        return;
      }
    } else if (alreadyRead) {
      setShowVIPModal(true);
      return;
    }
    setSpread(type);
    const count = spreadOptions.find(s => s.type === type)!.count;
    setRequiredCount(count);
    setSelectedIndices([]);
    setDrawnCards([]);
    setFlipped([]);
    setInterpretation("");
    const shuffled = shuffleDeck().slice(0, DISPLAY_CARD_COUNT);
    setDisplayDeck(shuffled);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase("picking");
  }, [alreadyRead, tarotData, isVipActive]);

  const handleWatchAdForTarot = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsWatchingAd(true);
    setAdCountdown(5);
    let count = 5;
    const iv = setInterval(() => {
      count -= 1;
      setAdCountdown(count);
      if (count <= 0) {
        clearInterval(iv);
        setIsWatchingAd(false);
        setAlreadyRead(false);
        setShowVIPModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1000);
  }, []);

  const pickCard = useCallback((idx: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(idx)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return prev.filter(i => i !== idx);
      }
      if (prev.length >= requiredCount) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return prev;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const next = [...prev, idx];
      if (next.length === requiredCount) {
        setTimeout(() => {
          const picked = next.map(i => ({
            ...displayDeck[i],
            reversed: Math.random() < 0.25,
          }));
          setDrawnCards(picked);
          setFlipped(new Array(requiredCount).fill(false));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setPhase("deck");
        }, 600);
      }
      return next;
    });
  }, [requiredCount, displayDeck]);

  const flipCard = useCallback((idx: number) => {
    if (flipped[idx]) return;
    for (let i = 0; i < idx; i++) {
      if (!flipped[i]) return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newFlipped = [...flipped];
    newFlipped[idx] = true;
    setFlipped(newFlipped);

    if (newFlipped.every(f => f)) {
      setTimeout(() => {
        fetchInterpretation();
      }, 600);
    }
  }, [flipped, drawnCards]);

  const markDone = async () => {
    const today = getTodayKey();
    const data = await getTarotData();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = yesterday.toISOString().split("T")[0];
    const newStreak = data.lastRead === yKey ? (data.streak ?? 0) + 1 : 1;
    const prevUsed: string[] = (data.lastRead === today ? data.vipUsedSpreads : null) ?? [];
    const vipUsedSpreads = isVipActive
      ? prevUsed.includes(spread) ? prevUsed : [...prevUsed, spread]
      : data.vipUsedSpreads;
    const updated: any = { lastRead: today, streak: newStreak, totalReadings: (data.totalReadings ?? 0) + 1, luckyCardId: luckyCard.id, vipUsedSpreads };
    await saveTarotData(updated);
    setTarotData(updated);
    setAlreadyRead(true);
  };

  const fetchInterpretation = async () => {
    setIsInterpreting(true);
    setPhase("reading");
    try {
      const url = new URL("/api/tarot-interpret", getApiUrl());
      const cardData = drawnCards.map(c => ({ name: c.nameEn, arcana: c.arcana, energy: c.energy, category: c.category, reversed: c.reversed }));
      const res = await expoFetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: cardData, spreadType: spread, language: user?.language ?? "tr" }),
      });

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) {
              fullText += parsed.content;
              setInterpretation(fullText);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("Tarot interpretation error:", err);
      setInterpretation(t("tarot.error"));
    } finally {
      setIsInterpreting(false);
      setPhase("done");
    }
  };

  const cardSize = drawnCards.length <= 1 ? "lg" as const : drawnCards.length <= 3 ? "md" as const : "sm" as const;

  const goBack = () => {
    if (phase === "select") {
      router.back();
    } else if (phase === "picking") {
      setPhase("select");
    } else {
      setPhase("select");
    }
  };

  if (phase === "loading") return <View style={[styles.root, { paddingTop: topPad }]}><LinearGradient colors={["#0D0020", "#1A0040", "#0D0020"]} style={StyleSheet.absoluteFill} /><ActivityIndicator color="#C084FC" style={{ flex: 1 }} /></View>;

  return (
    <View style={[styles.root, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0D0020", "#1A0040", "#0D0020"]} style={StyleSheet.absoluteFill} />

      {[0,1,2,3,4,5,6,7].map(i => <GlowDot key={i} delay={i} size={2 + (i % 3)} color={i % 2 === 0 ? "#C084FC" : "#FFD700"} />)}

      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <Feather name="chevron-left" size={24} color="rgba(255,255,255,0.8)" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tarot Falı</Text>
          {tarotData?.streak > 0 && (
            <View style={styles.streakBadge}>
              <Feather name="zap" size={10} color="#FFD700" />
              <Text style={styles.streakText}>{tarotData.streak} gün seri</Text>
            </View>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 24 }]} showsVerticalScrollIndicator={false}>

        {phase === "select" && (
          <>
            <View style={styles.luckySection}>
              <Text style={styles.luckyTitle}>Günün Şanslı Kartı</Text>
              <LinearGradient colors={luckyCard.gradient} style={styles.luckyCard}>
                <Feather name={luckyCard.icon as any} size={28} color="rgba(255,255,255,0.9)" />
                <Text style={styles.luckyName}>{luckyCard.name}</Text>
                <Text style={styles.luckyEnergy}>{luckyCard.energy}</Text>
              </LinearGradient>
            </View>

            <Text style={styles.spreadTitle}>Yayılım Seç</Text>

            {spreadOptions.map(opt => (
              <Pressable
                key={opt.type}
                onPress={() => startReading(opt.type)}
                style={styles.spreadOption}
              >
                <LinearGradient colors={["rgba(192,132,252,0.12)", "rgba(192,132,252,0.04)"]} style={styles.spreadOptionGrad}>
                  <View style={styles.spreadOptionIcon}>
                    <Feather name={opt.icon as any} size={22} color="#C084FC" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.spreadOptionLabel}>{opt.label}</Text>
                    <Text style={styles.spreadOptionDesc}>{opt.desc}</Text>
                  </View>
                  <View style={styles.spreadCount}>
                    <Text style={styles.spreadCountText}>{opt.count}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
                </LinearGradient>
              </Pressable>
            ))}

            {(tarotData?.totalReadings ?? 0) > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{tarotData?.totalReadings ?? 0}</Text>
                  <Text style={styles.statLabel}>Toplam Fal</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{tarotData?.streak ?? 0}</Text>
                  <Text style={styles.statLabel}>Gün Seri</Text>
                </View>
              </View>
            )}
          </>
        )}

        {phase === "picking" && (
          <View style={styles.pickingArea}>
            <View style={styles.pickingHeader}>
              <Text style={styles.pickingTitle}>Kartlarını Seç</Text>
              <View style={styles.pickingCounter}>
                <Text style={styles.pickingCounterText}>
                  {selectedIndices.length} / {requiredCount}
                </Text>
              </View>
            </View>
            <Text style={styles.pickingSubtitle}>
              Sezgilerine güven ve {requiredCount} kart seç
            </Text>

            <View style={styles.pickingProgress}>
              {Array.from({ length: requiredCount }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pickingDot,
                    i < selectedIndices.length && styles.pickingDotActive,
                  ]}
                />
              ))}
            </View>

            <View style={styles.pickingGrid}>
              {displayDeck.map((card, idx) => (
                <PickableCardBack
                  key={card.id}
                  index={idx}
                  isSelected={selectedIndices.includes(idx)}
                  onPress={() => pickCard(idx)}
                />
              ))}
            </View>

            {selectedIndices.length === requiredCount && (
              <View style={styles.pickingTransition}>
                <ActivityIndicator size="small" color="#C084FC" />
                <Text style={styles.pickingTransitionText}>Kartlar açılıyor...</Text>
              </View>
            )}
          </View>
        )}

        {(phase === "deck" || phase === "reading" || phase === "done") && (
          <>
            <View style={styles.deckArea}>
              <Text style={styles.deckTitle}>
                {flipped.every(f => f) ? t("tarot.cardsRevealed") :
                  t("tarot.cardsRemaining", { count: flipped.filter(f => !f).length })}
              </Text>
              <View style={[styles.cardsRow, drawnCards.length === 5 && { flexWrap: "wrap" }]}>
                {drawnCards.map((card, idx) => (
                  <View key={card.id} style={{ alignItems: "center", gap: 6 }}>
                    {flipped[idx] ? (
                      <RevealedCard card={card} position={positionLabels[spread][idx]} reversed={card.reversed} size={cardSize} />
                    ) : (
                      <>
                        <MysticalCardBack
                          onPress={() => flipCard(idx)}
                          isActive={!flipped[idx] && (idx === 0 || flipped[idx - 1])}
                          size={cardSize}
                        />
                        <Text style={styles.posLabel}>{positionLabels[spread][idx]}</Text>
                      </>
                    )}
                  </View>
                ))}
              </View>
              {!flipped.every(f => f) && (
                <Text style={styles.hintText}>
                  {positionLabels[spread][flipped.findIndex(f => !f)]} — {t("tarot.flipHint")}
                </Text>
              )}
            </View>

            {(phase === "reading" || phase === "done") && (
              <View style={styles.interpretSection}>
                <LinearGradient colors={["rgba(192,132,252,0.15)", "rgba(107,33,168,0.08)"]} style={styles.interpretGrad}>
                  <View style={styles.interpretHeader}>
                    {isInterpreting ? (
                      <>
                        <View style={styles.crystalBall}>
                          <ActivityIndicator size="small" color="#C084FC" />
                        </View>
                        <Text style={styles.interpretTitle}>Yıldızlar Konuşuyor...</Text>
                      </>
                    ) : (
                      <>
                        <Feather name="eye" size={18} color="#C084FC" />
                        <Text style={styles.interpretTitle}>Falın Yorumu</Text>
                      </>
                    )}
                  </View>

                  {drawnCards.map((card, idx) => (
                    <View key={card.id} style={styles.cardSummary}>
                      <LinearGradient colors={card.gradient} style={styles.cardSummaryIcon}>
                        <Feather name={card.icon as any} size={12} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.cardSummaryPos}>{positionLabels[spread][idx]}</Text>
                      <Text style={styles.cardSummaryName}>{card.name}</Text>
                      {card.reversed && <Text style={styles.cardSummaryReversed}>Ters</Text>}
                    </View>
                  ))}

                  <View style={styles.interpretDivider} />

                  {interpretation ? (
                    <Text style={styles.interpretText}>{interpretation}</Text>
                  ) : isInterpreting ? (
                    <View style={{ padding: 20, alignItems: "center" }}>
                      <Text style={styles.interpretWait}>Kristal küre parlıyor...</Text>
                    </View>
                  ) : null}
                </LinearGradient>
              </View>
            )}

            {phase === "done" && (
              <Pressable onPress={() => setPhase("select")} style={styles.newReadingBtn}>
                <LinearGradient colors={["#6B21A8", "#C084FC"]} style={styles.newReadingGrad}>
                  <Feather name="repeat" size={16} color="#fff" />
                  <Text style={styles.newReadingText}>Ana Menüye Dön</Text>
                </LinearGradient>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showVIPModal} transparent animationType="fade" onRequestClose={() => setShowVIPModal(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <LinearGradient colors={["#1A0A3E", "#0D0025"]} style={StyleSheet.absoluteFill} />
            <View style={styles.modalIcon}>
              <Feather name="eye" size={32} color="#C084FC" />
            </View>
            <Text style={styles.modalTitle}>{t("tarot.spreadUsed")}</Text>
            <Text style={styles.modalDesc}>{t("tarot.alreadyRead")}</Text>
            <Pressable
              onPress={handleWatchAdForTarot}
              disabled={isWatchingAd}
              style={styles.modalWatchAdBtn}
            >
              <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.modalWatchAdGrad}>
                <Feather name="play-circle" size={16} color="#C084FC" />
                <Text style={styles.modalWatchAdText}>
                  {isWatchingAd ? `${adCountdown}s` : t("tarot.watchAd")}
                </Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setShowVIPModal(false)} style={styles.modalBtn}>
              <LinearGradient colors={["#6B21A8", "#C084FC"]} style={styles.modalBtnGrad}>
                <Text style={styles.modalBtnText}>{t("tarot.done")}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.5 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,215,0,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  streakText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#FFD700" },
  scrollContent: { paddingHorizontal: 20 },
  luckySection: { alignItems: "center", marginBottom: 28, gap: 12 },
  luckyTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase" },
  luckyCard: { width: 100, height: 130, borderRadius: 16, justifyContent: "center", alignItems: "center", gap: 8, shadowColor: "#6B21A8", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  luckyName: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  luckyEnergy: { fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
  spreadTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.5)", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },
  spreadOption: { marginBottom: 10, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(192,132,252,0.15)" },
  spreadOptionGrad: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 16 },
  spreadOptionIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(192,132,252,0.15)", justifyContent: "center", alignItems: "center" },
  spreadOptionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  spreadOptionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 2 },
  spreadCount: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(192,132,252,0.2)", justifyContent: "center", alignItems: "center" },
  spreadCountText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#C084FC" },
  statsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24, gap: 24 },
  statItem: { alignItems: "center", gap: 4 },
  statNum: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#C084FC" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.1)" },

  pickingArea: { alignItems: "center", gap: 16 },
  pickingHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  pickingTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  pickingCounter: { backgroundColor: "rgba(192,132,252,0.2)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: "rgba(192,132,252,0.3)" },
  pickingCounterText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#C084FC" },
  pickingSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", textAlign: "center" },
  pickingProgress: { flexDirection: "row", gap: 8, marginTop: 4 },
  pickingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(192,132,252,0.2)", borderWidth: 1, borderColor: "rgba(192,132,252,0.3)" },
  pickingDotActive: { backgroundColor: "#C084FC", borderColor: "#C084FC" },
  pickingGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 8, paddingHorizontal: 0 },
  pickingTransition: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, backgroundColor: "rgba(192,132,252,0.1)", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  pickingTransitionText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#C084FC" },

  deckArea: { alignItems: "center", gap: 16, marginBottom: 20 },
  deckTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)" },
  cardsRow: { flexDirection: "row", justifyContent: "center", gap: 12, flexWrap: "nowrap" },
  cardGlow: { position: "absolute", backgroundColor: "#C084FC", shadowColor: "#C084FC", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20 },
  cardBack: { borderRadius: 16, overflow: "hidden", justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "rgba(192,132,252,0.3)" },
  cardBackInner: { alignItems: "center", gap: 12 },
  cardBackSymbol: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(192,132,252,0.1)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(192,132,252,0.2)" },
  cardBackLine: { width: 30, height: 1, backgroundColor: "rgba(192,132,252,0.2)" },
  cardBackTap: { fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(192,132,252,0.5)" },
  cardBackBorder: { position: "absolute", borderWidth: 1, borderColor: "rgba(255,215,0,0.1)", borderRadius: 12 },
  posLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.4)", letterSpacing: 0.5, textTransform: "uppercase" },
  revealedCard: { borderRadius: 16, justifyContent: "center", alignItems: "center", gap: 6, padding: 8, shadowColor: "#6B21A8", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  rareCard: { borderWidth: 2, borderColor: "#FFD700" },
  rareBadge: { position: "absolute", top: 6, right: 6, backgroundColor: "#FFD700", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  rareBadgeText: { fontSize: 7, fontFamily: "Inter_700Bold", color: "#000", letterSpacing: 0.5 },
  revealedIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  revealedName: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  revealedNameEn: { fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center" },
  reversedLabel: { fontSize: 8, fontFamily: "Inter_600SemiBold", color: "#FF6B6B", backgroundColor: "rgba(255,107,107,0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  categoryText: { fontSize: 8, fontFamily: "Inter_600SemiBold" },
  hintText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)", textAlign: "center" },
  interpretSection: { marginTop: 8 },
  interpretGrad: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(192,132,252,0.2)" },
  interpretHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  crystalBall: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(192,132,252,0.15)", justifyContent: "center", alignItems: "center" },
  interpretTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#C084FC" },
  cardSummary: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  cardSummaryIcon: { width: 24, height: 24, borderRadius: 7, justifyContent: "center", alignItems: "center" },
  cardSummaryPos: { fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", width: 70 },
  cardSummaryName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff", flex: 1 },
  cardSummaryReversed: { fontSize: 9, fontFamily: "Inter_500Medium", color: "#FF6B6B", backgroundColor: "rgba(255,107,107,0.15)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  interpretDivider: { height: 1, backgroundColor: "rgba(192,132,252,0.15)", marginVertical: 14 },
  interpretText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)", lineHeight: 22 },
  interpretWait: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(192,132,252,0.6)", fontStyle: "italic" },
  newReadingBtn: { borderRadius: 16, overflow: "hidden", marginTop: 16 },
  newReadingGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  newReadingText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  modalCard: { width: "100%", borderRadius: 24, overflow: "hidden", padding: 32, alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(192,132,252,0.3)" },
  modalIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(192,132,252,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center" },
  modalDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 21 },
  modalBtn: { borderRadius: 16, overflow: "hidden", width: "100%", marginTop: 8 },
  modalBtnGrad: { alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  modalBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  modalWatchAdBtn: { borderRadius: 16, overflow: "hidden", width: "100%", borderWidth: 1, borderColor: "rgba(192,132,252,0.3)" },
  modalWatchAdGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  modalWatchAdText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#C084FC" },
});
