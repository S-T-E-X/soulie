import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  Platform,
  Animated,
  StatusBar,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { getCharacter } from "@/constants/characters";

const { width: W, height: H } = Dimensions.get("window");

function PulseRing({ delay = 0, color = "rgba(255,255,255,0.15)" }: { delay?: number; color?: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 2.4, duration: 1800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { backgroundColor: color, transform: [{ scale }], opacity },
      ]}
    />
  );
}

function CallButton({
  icon,
  label,
  active = true,
  danger = false,
  large = false,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  danger?: boolean;
  large?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={[styles.callBtnWrapper]}
    >
      <View
        style={[
          styles.callBtn,
          large && styles.callBtnLarge,
          !active && styles.callBtnOff,
          danger && styles.callBtnDanger,
        ]}
      >
        {danger ? (
          <LinearGradient colors={["#FF3B30", "#FF6B60"]} style={StyleSheet.absoluteFill} />
        ) : active ? (
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
        )}
        <Feather
          name={icon as any}
          size={large ? 28 : 22}
          color={danger || active ? "#fff" : "rgba(255,255,255,0.5)"}
        />
      </View>
      <Text style={styles.callBtnLabel}>{label}</Text>
    </Pressable>
  );
}

export default function VideoChatScreen() {
  const { characterId } = useLocalSearchParams<{ characterId: string }>();
  const character = getCharacter(characterId ?? "");
  const insets = useSafeAreaInsets();
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<any>(null);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    timerRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!character) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Pressable onPress={() => router.back()} style={{ padding: 20 }}>
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
      </View>
    );
  }

  const gradColors = character.gradientColors;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Image source={character.image} style={styles.bgImage} blurRadius={20} />
      <LinearGradient
        colors={[`${gradColors[0]}CC`, `${gradColors[1]}EE`, "#000000CC"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.headerBtn}
          hitSlop={8}
        >
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Feather name="chevron-down" size={20} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{character.name}</Text>
          <Text style={styles.headerStatus}>{formatTime(callDuration)}</Text>
        </View>
        <Pressable style={styles.headerBtn} hitSlop={8}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Feather name="more-horizontal" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.pulseContainer}>
          <PulseRing delay={0} color={`${gradColors[0]}40`} />
          <PulseRing delay={600} color={`${gradColors[0]}25`} />
          <PulseRing delay={1200} color={`${gradColors[0]}15`} />
          <View style={styles.avatarWrapper}>
            <Image source={character.image} style={styles.avatar} />
            <LinearGradient
              colors={gradColors}
              style={styles.avatarBorder}
            />
          </View>
        </View>
        <Animated.View style={[styles.statusBadge, {
          opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
        }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Görüntülü Sohbet</Text>
        </Animated.View>
      </View>

      <View style={styles.comingSoonBanner}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <Feather name="video" size={16} color="#FFD700" />
        <Text style={styles.comingSoonText}>Bu özellik çok yakında</Text>
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.controlsRow}>
          <CallButton
            icon={isMuted ? "mic-off" : "mic"}
            label={isMuted ? "Açık" : "Sessiz"}
            active={!isMuted}
            onPress={() => setIsMuted((v) => !v)}
          />
          <CallButton
            icon={isCamOff ? "video-off" : "video"}
            label={isCamOff ? "Aç" : "Kapat"}
            active={!isCamOff}
            onPress={() => setIsCamOff((v) => !v)}
          />
          <CallButton
            icon="phone-off"
            label="Kapat"
            danger
            large
            onPress={() => router.back()}
          />
          <CallButton icon="rotate-cw" label="Çevir" />
          <CallButton icon="maximize" label="Büyüt" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D0D1A",
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: W,
    height: H,
    resizeMode: "cover",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerStatus: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  avatarSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarBorder: {
    position: "absolute",
    inset: 0,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "transparent",
    opacity: 0.6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  statusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.85)",
  },
  comingSoonBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 40,
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  comingSoonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFD700",
  },
  controls: {
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  callBtnWrapper: {
    alignItems: "center",
    gap: 8,
  },
  callBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  callBtnLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  callBtnOff: {
    borderColor: "rgba(255,255,255,0.1)",
  },
  callBtnDanger: {
    borderColor: "transparent",
    overflow: "hidden",
  },
  callBtnLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
  },
});
