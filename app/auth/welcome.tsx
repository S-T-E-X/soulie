import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

const WELCOME_BG_IMAGE = null;

function AuthButton({
  icon,
  label,
  onPress,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  delay?: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
    >
      <Pressable
        style={({ pressed }) => [styles.authButton, pressed && styles.authButtonPressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        <View style={styles.authButtonIcon}>{icon}</View>
        <Text style={styles.authButtonText}>{label}</Text>
        <View style={styles.authButtonArrow}>
          <Feather name="chevron-right" size={16} color="rgba(0,0,0,0.3)" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(titleSlide, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const navigateToOnboarding = (method: "apple" | "google" | "email") => {
    router.push({ pathname: "/auth/onboarding", params: { method } });
  };

  return (
    <View style={styles.container}>
      {WELCOME_BG_IMAGE ? (
        <Image
          source={WELCOME_BG_IMAGE}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={["#1a1a2e", "#16213e", "#0f3460", "#533483"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={[styles.overlay, StyleSheet.absoluteFill]} />

      <View style={[styles.content, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <Animated.View
          style={[styles.titleContainer, { opacity: titleFade, transform: [{ translateY: titleSlide }] }]}
        >
          <Text style={styles.appTitle}>Soulie</Text>
          <Text style={styles.appSubtitle}>
            Seninle her zaman yanında olan{"\n"}AI arkadaşın
          </Text>
        </Animated.View>
      </View>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
        <AuthButton
          icon={<Ionicons name="logo-apple" size={20} color="#000" />}
          label="Apple ile Giriş Yap"
          onPress={() => navigateToOnboarding("apple")}
          delay={400}
        />
        <AuthButton
          icon={
            <View style={styles.googleIcon}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
          }
          label="Google ile Giriş Yap"
          onPress={() => navigateToOnboarding("google")}
          delay={500}
        />
        <AuthButton
          icon={<Feather name="mail" size={18} color="#000" />}
          label="Email ile Giriş Yap"
          onPress={() => navigateToOnboarding("email")}
          delay={600}
        />
        <Text style={styles.termsText}>
          Devam ederek{" "}
          <Text style={styles.termsLink} onPress={() => router.push("/privacy")}>
            Gizlilik Politikamızı
          </Text>{" "}
          kabul etmiş olursunuz.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  titleContainer: {
    alignItems: "center",
  },
  appTitle: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -1,
    marginBottom: 12,
  },
  appSubtitle: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  authButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  authButtonIcon: {
    width: 28,
    alignItems: "center",
  },
  authButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#000",
    marginLeft: 12,
  },
  authButtonArrow: {
    marginLeft: 8,
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  termsText: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 8,
  },
  termsLink: {
    color: "rgba(255,255,255,0.8)",
    textDecorationLine: "underline",
  },
});
