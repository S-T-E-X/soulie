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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

const STORAGE_KEY = "soulie_tarot_v1";

const TAROT_CARDS = [
  { id: "fool", name: "Deli", nameEn: "The Fool", icon: "star" as const, gradient: ["#667eea", "#764ba2"] as [string, string], meaning: "Yeni başlangıçlar, özgürlük ve macera seni bekliyor. Korkularını bırak ve hayatın akışına güven." },
  { id: "magician", name: "Büyücü", nameEn: "The Magician", icon: "zap" as const, gradient: ["#f093fb", "#f5576c"] as [string, string], meaning: "İçindeki güç ve yaratıcılık zirveye ulaşıyor. Elindeki tüm araçları kullanma vakti geldi." },
  { id: "priestess", name: "Rahibe", nameEn: "High Priestess", icon: "moon" as const, gradient: ["#4facfe", "#00f2fe"] as [string, string], meaning: "Sezgilerine güven. Gizli bilgiler yüzeye çıkıyor; içsesini dinle." },
  { id: "empress", name: "İmparatoriçe", nameEn: "The Empress", icon: "heart" as const, gradient: ["#43e97b", "#38f9d7"] as [string, string], meaning: "Bereket ve bolluk dönemi. Sevgi ve doğanın gücüyle bağlantı kur." },
  { id: "emperor", name: "İmparator", nameEn: "The Emperor", icon: "shield" as const, gradient: ["#fa709a", "#fee140"] as [string, string], meaning: "Yapı ve otorite. Hayatında düzeni sağla; kararlı adımlar at." },
  { id: "hierophant", name: "Hiyerofant", nameEn: "The Hierophant", icon: "book" as const, gradient: ["#a18cd1", "#fbc2eb"] as [string, string], meaning: "Geleneksel bilgelik ve rehberlik. Güvendiğin birine danış." },
  { id: "lovers", name: "Aşıklar", nameEn: "The Lovers", icon: "sun" as const, gradient: ["#ff9a9e", "#fad0c4"] as [string, string], meaning: "Önemli bir seçim kapıda. Kalbin seni doğru yöne götürecek." },
  { id: "chariot", name: "Savaş Arabası", nameEn: "The Chariot", icon: "navigation" as const, gradient: ["#30cfd0", "#330867"] as [string, string], meaning: "Zafer ve irade gücü. Odaklan ve hedefe koş; engeller aşılabilir." },
  { id: "strength", name: "Güç", nameEn: "Strength", icon: "award" as const, gradient: ["#f77062", "#fe5196"] as [string, string], meaning: "İç gücün her zaman beklediğinden fazla. Sabırla ve sevgiyle ilerle." },
  { id: "hermit", name: "Ermiş", nameEn: "The Hermit", icon: "eye" as const, gradient: ["#96fbc4", "#f9f586"] as [string, string], meaning: "İçsel yolculuk zamanı. Yalnızlık seni güçlendirir; cevaplar içinde." },
  { id: "wheel", name: "Kader Çarkı", nameEn: "Wheel of Fortune", icon: "refresh-cw" as const, gradient: ["#fddb92", "#d1fdff"] as [string, string], meaning: "Değişim rüzgarı esiyor. Hayatın döngüsünü kabul et; iyi zamanlar geliyor." },
  { id: "justice", name: "Adalet", nameEn: "Justice", icon: "sliders" as const, gradient: ["#89f7fe", "#66a6ff"] as [string, string], meaning: "Denge ve adalet devrede. Doğru kararlar verilecek; dürüstlük ödüllendirilir." },
  { id: "star", name: "Yıldız", nameEn: "The Star", icon: "star" as const, gradient: ["#a1c4fd", "#c2e9fb"] as [string, string], meaning: "Umut ve ilham parlıyor. Hayallerini takip et; evren seni destekliyor." },
  { id: "moon", name: "Ay", nameEn: "The Moon", icon: "moon" as const, gradient: ["#2c3e50", "#3498db"] as [string, string], meaning: "Bilinçaltı mesajlar geliyor. Rüyalarına ve sezgilerine dikkat et." },
  { id: "world", name: "Dünya", nameEn: "The World", icon: "globe" as const, gradient: ["#11998e", "#38ef7d"] as [string, string], meaning: "Tamamlanma ve başarı. Bir dönem kapanıyor; yeni bir sayfa açılıyor." },
];

const POSITIONS = ["Geçmiş", "Şu An", "Gelecek"];

type CardState = "back" | "flipping" | "front";

function TarotCard({
  card,
  position,
  state,
  onFlip,
}: {
  card: (typeof TAROT_CARDS)[0];
  position: string;
  state: CardState;
  onFlip: () => void;
}) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [showFront, setShowFront] = useState(false);

  useEffect(() => {
    if (state === "flipping") {
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => setShowFront(true));
    }
  }, [state]);

  const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] });
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["-90deg", "0deg"] });

  return (
    <View style={styles.cardOuter}>
      <Text style={styles.positionLabel}>{position}</Text>
      <Pressable onPress={state === "back" ? onFlip : undefined} style={styles.cardPressable}>
        {!showFront ? (
          <Animated.View style={[styles.card, { transform: [{ rotateY: backRotate }] }]}>
            <LinearGradient colors={["#1A1A3E", "#6B21A8"]} style={styles.cardGradient}>
              <View style={styles.cardBackPattern}>
                {[0,1,2,3,4,5,6,7,8].map(i => (
                  <View key={i} style={styles.cardBackDot} />
                ))}
              </View>
              <Feather name="eye" size={28} color="rgba(255,255,255,0.4)" />
              <Text style={styles.tapText}>Dokun</Text>
            </LinearGradient>
          </Animated.View>
        ) : (
          <Animated.View style={[styles.card, { transform: [{ rotateY: frontRotate }] }]}>
            <LinearGradient colors={card.gradient} style={styles.cardGradient}>
              <View style={styles.cardIconCircle}>
                <Feather name={card.icon} size={32} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.cardName}>{card.name}</Text>
              <Text style={styles.cardNameEn}>{card.nameEn}</Text>
            </LinearGradient>
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
}

async function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

async function hasReadToday(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data.lastRead === await getTodayKey();
  } catch {
    return false;
  }
}

async function markReadToday() {
  try {
    const key = await getTodayKey();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ lastRead: key }));
  } catch {}
}

function shuffleCards(): (typeof TAROT_CARDS)[0][] {
  const today = new Date().toISOString().split("T")[0];
  const seed = today.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = [...TAROT_CARDS].sort((a, b) => {
    const ha = (seed * a.id.length * 13) % 997;
    const hb = (seed * b.id.length * 13) % 997;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

export default function TarotScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [checked, setChecked] = useState(false);
  const [alreadyRead, setAlreadyRead] = useState(false);
  const [cards] = useState(() => shuffleCards());
  const [cardStates, setCardStates] = useState<CardState[]>(["back", "back", "back"]);
  const [showResult, setShowResult] = useState(false);
  const [showVIPModal, setShowVIPModal] = useState(false);

  const allFlipped = cardStates.every((s) => s !== "back");

  useEffect(() => {
    hasReadToday().then((done) => {
      setAlreadyRead(done);
      setChecked(true);
    });
  }, []);

  const flipCard = useCallback(async (idx: number) => {
    if (alreadyRead) { setShowVIPModal(true); return; }
    const prev = [...cardStates];
    if (prev[idx] !== "back") return;
    for (let i = 0; i < idx; i++) {
      if (prev[i] === "back") return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    prev[idx] = "flipping";
    setCardStates([...prev]);

    const newStates = prev.map((s) => (s === "flipping" ? "front" : s));
    const allDone = newStates.every((s) => s === "front");
    if (allDone) {
      await markReadToday();
      setTimeout(() => setShowResult(true), 800);
    }
  }, [cardStates, alreadyRead]);

  if (!checked) return null;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0D0020", "#1A0040", "#0D0020"]} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="chevron-left" size={24} color="rgba(255,255,255,0.8)" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tarot Falı</Text>
          <Text style={styles.headerSub}>Üç kartı sırayla aç</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {alreadyRead && (
        <View style={styles.alreadyReadBanner}>
          <Feather name="clock" size={14} color="#FFD700" />
          <Text style={styles.alreadyReadText}>Bugünkü falını baktırdın. Yarın tekrar gel.</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardsRow}>
          {cards.map((card, idx) => (
            <TarotCard
              key={card.id}
              card={card}
              position={POSITIONS[idx]}
              state={cardStates[idx]}
              onFlip={() => flipCard(idx)}
            />
          ))}
        </View>

        {!allFlipped && !alreadyRead && (
          <Text style={styles.hintText}>
            {cardStates[0] === "back" ? "Geçmişini temsil eden kartı aç" :
             cardStates[1] === "back" ? "Şu anını temsil eden kartı aç" :
             "Geleceğini temsil eden kartı aç"}
          </Text>
        )}

        {showResult && (
          <Animated.View style={styles.resultSection}>
            <LinearGradient colors={["rgba(107,33,168,0.3)", "rgba(107,33,168,0.1)"]} style={styles.resultGradient}>
              <View style={styles.resultHeader}>
                <Feather name="eye" size={20} color="#C084FC" />
                <Text style={styles.resultTitle}>Falın Yorumu</Text>
              </View>
              {cards.map((card, idx) => (
                <View key={card.id} style={styles.resultCard}>
                  <View style={styles.resultCardHeader}>
                    <LinearGradient colors={card.gradient} style={styles.resultCardIcon}>
                      <Feather name={card.icon} size={14} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.resultCardPos}>{POSITIONS[idx]}</Text>
                    <Text style={styles.resultCardName}>{card.name}</Text>
                  </View>
                  <Text style={styles.resultCardMeaning}>{card.meaning}</Text>
                </View>
              ))}
            </LinearGradient>
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={showVIPModal} transparent animationType="fade" onRequestClose={() => setShowVIPModal(false)}>
        <View style={styles.vipBackdrop}>
          <View style={styles.vipCard}>
            <LinearGradient colors={["#1A1A3E", "#6B21A8"]} style={StyleSheet.absoluteFill} />
            <View style={styles.vipIconWrap}>
              <Feather name="eye" size={32} color="#C084FC" />
            </View>
            <Text style={styles.vipTitle}>Günlük Fal Hakkın Doldu</Text>
            <Text style={styles.vipDesc}>Her gün ücretsiz 1 tarot falı hakkın var. Daha fazla fal için Market'e git.</Text>
            <Pressable
              onPress={() => { setShowVIPModal(false); router.push("/(tabs)/market"); }}
              style={styles.vipBtn}
            >
              <LinearGradient colors={[Colors.userBubble.from, Colors.userBubble.to]} style={styles.vipBtnGrad}>
                <Feather name="shopping-bag" size={16} color="#fff" />
                <Text style={styles.vipBtnText}>Market'e Git</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setShowVIPModal(false)} hitSlop={8} style={{ marginTop: 8 }}>
              <Text style={styles.vipClose}>Kapat</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CARD_W = 100;
const CARD_H = 160;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.4 },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", marginTop: 2 },
  alreadyReadBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,215,0,0.1)", marginHorizontal: 20, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,215,0,0.2)" },
  alreadyReadText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#FFD700", flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  cardsRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginBottom: 24 },
  cardOuter: { alignItems: "center", gap: 10 },
  positionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)", letterSpacing: 0.5, textTransform: "uppercase" },
  cardPressable: { width: CARD_W, height: CARD_H },
  card: { width: CARD_W, height: CARD_H, borderRadius: 16, overflow: "hidden", shadowColor: "#6B21A8", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  cardGradient: { flex: 1, justifyContent: "center", alignItems: "center", padding: 12, gap: 8 },
  cardBackPattern: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 6, opacity: 0.15 },
  cardBackDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#fff" },
  tapText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)" },
  cardIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  cardName: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", letterSpacing: -0.2 },
  cardNameEn: { fontSize: 9, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)", textAlign: "center" },
  hintText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 16 },
  resultSection: { marginTop: 8 },
  resultGradient: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(192,132,252,0.2)" },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  resultTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#C084FC" },
  resultCard: { marginBottom: 16 },
  resultCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  resultCardIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  resultCardPos: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" },
  resultCardName: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  resultCardMeaning: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", lineHeight: 20, paddingLeft: 34 },
  vipBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  vipCard: { width: "100%", borderRadius: 28, overflow: "hidden", padding: 32, alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(192,132,252,0.3)" },
  vipIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: "rgba(192,132,252,0.15)", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  vipTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", letterSpacing: -0.5 },
  vipDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", textAlign: "center", lineHeight: 21 },
  vipBtn: { borderRadius: 16, overflow: "hidden", width: "100%", marginTop: 4 },
  vipBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  vipBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  vipClose: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
});
