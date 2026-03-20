import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Animated,
  Image,
  Dimensions,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { getTranslation } from "@/constants/i18n";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_LANG = "en";
const { width, height } = Dimensions.get("window");
const WELCOME_BG_IMAGE = null;

function AuthButton({
  icon,
  label,
  onPress,
  delay = 0,
  loading = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  delay?: number;
  loading?: boolean;
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
        style={({ pressed }) => [
          styles.authButton,
          (pressed || loading) && styles.authButtonPressed,
        ]}
        onPress={() => {
          if (!loading) onPress();
        }}
        disabled={loading}
      >
        <View style={styles.authButtonIcon}>{icon}</View>
        <Text style={styles.authButtonText}>{label}</Text>
        <View style={styles.authButtonArrow}>
          {loading ? (
            <Ionicons name="ellipsis-horizontal" size={16} color="rgba(0,0,0,0.3)" />
          ) : (
            <Feather name="chevron-right" size={16} color="rgba(0,0,0,0.3)" />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const GOOGLE_IOS_CLIENT_ID =
  "925534757567-vms4ukvoq6c7m4ca2vkj09of6n1kc1lc.apps.googleusercontent.com";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(-20)).current;
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const accessToken = googleResponse.authentication?.accessToken;
      if (accessToken) {
        handleGoogleToken(accessToken);
      }
    } else if (googleResponse?.type === "error" || googleResponse?.type === "dismiss") {
      setGoogleLoading(false);
    }
  }, [googleResponse]);

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

  const handleGoogleToken = async (accessToken: string) => {
    try {
      const url = new URL("/api/auth/google-login", getApiUrl());
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Google auth failed");
      }

      const data = await response.json();

      if (data.isNewUser) {
        router.push({
          pathname: "/auth/social-onboarding",
          params: {
            method: "google",
            email: data.email || "",
            registeredId: data.id,
            registeredUserId: data.userId,
            prefillName: data.name || "",
          },
        });
      } else {
        await login(data.user);
        router.replace("/(tabs)/explore");
      }
    } catch (e: any) {
      console.error("[Google] Login error:", e);
      Alert.alert("Error", "Google Sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setGoogleLoading(true);
      await googlePromptAsync();
    } catch (e: any) {
      console.error("[Google] promptAsync error:", e);
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== "ios") return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAppleLoading(true);

      const AppleAuth = await import("expo-apple-authentication");
      const isAvailable = await AppleAuth.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Not Available", "Apple Sign-in is not available on this device.");
        return;
      }

      const credential = await AppleAuth.signInAsync({
        requestedScopes: [
          AppleAuth.AppleAuthenticationScope.FULL_NAME,
          AppleAuth.AppleAuthenticationScope.EMAIL,
        ],
      });

      const url = new URL("/api/auth/apple-login", getApiUrl());
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          appleUserId: credential.user,
          email: credential.email,
          fullName: credential.fullName,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Apple auth failed");
      }

      const data = await response.json();

      if (data.isNewUser) {
        router.push({
          pathname: "/auth/social-onboarding",
          params: {
            method: "apple",
            email: data.email || "",
            registeredId: data.id,
            registeredUserId: data.userId,
          },
        });
      } else {
        await login(data.user);
        router.replace("/(tabs)/explore");
      }
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") return;
      console.error("[Apple] Login error:", e);
      Alert.alert("Error", "Apple Sign-in failed. Please try again.");
    } finally {
      setAppleLoading(false);
    }
  };

  const navigateToOnboarding = (method: "google" | "email") => {
    if (method === "email") {
      router.push({ pathname: "/auth/email-register" });
    } else {
      router.push({ pathname: "/auth/social-onboarding", params: { method } });
    }
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

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) },
        ]}
      >
        <Animated.View
          style={[
            styles.titleContainer,
            { opacity: titleFade, transform: [{ translateY: titleSlide }] },
          ]}
        >
          <Text style={styles.appTitle}>Soulie</Text>
          <Text style={styles.appSubtitle}>
            {getTranslation(DEFAULT_LANG, "welcome.subtitle")}
          </Text>
        </Animated.View>
      </View>

      <View
        style={[
          styles.bottomContainer,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16,
          },
        ]}
      >
        {Platform.OS === "ios" && (
          <AuthButton
            icon={<Ionicons name="logo-apple" size={20} color="#000" />}
            label={
              appleLoading
                ? "Signing in..."
                : getTranslation(DEFAULT_LANG, "welcome.loginWithApple")
            }
            onPress={handleAppleLogin}
            loading={appleLoading}
            delay={400}
          />
        )}
        <AuthButton
          icon={
            <View style={styles.googleIcon}>
              <Text style={styles.googleIconText}>G</Text>
            </View>
          }
          label={
            googleLoading
              ? "Signing in..."
              : getTranslation(DEFAULT_LANG, "welcome.loginWithGoogle")
          }
          onPress={handleGoogleLogin}
          loading={googleLoading}
          delay={500}
        />
        <AuthButton
          icon={<Feather name="mail" size={18} color="#000" />}
          label={getTranslation(DEFAULT_LANG, "welcome.loginWithEmail")}
          onPress={() => navigateToOnboarding("email")}
          delay={600}
        />
        <Text style={styles.termsText}>
          {getTranslation(DEFAULT_LANG, "welcome.terms")}{" "}
          <Text
            style={styles.termsLink}
            onPress={() => router.push("/privacy")}
          >
            {getTranslation(DEFAULT_LANG, "welcome.termsLink")}
          </Text>
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
