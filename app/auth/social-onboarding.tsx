import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { getTranslation } from "@/constants/i18n";
import { getApiUrl } from "@/lib/query-client";

const ACCENT = "#6C5CE7";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

export default function SocialOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ method?: string; email?: string; registeredId?: string; registeredUserId?: string }>();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [language, setLanguage] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 16;
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16;

  const method = params.method ?? "google";
  const isApple = method === "apple";
  const isEmail = method === "email";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    setTimeout(() => nameRef.current?.focus(), 600);
  }, []);

  const selectedLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const handleContinue = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const id = params.registeredId ?? ("u_" + Date.now().toString() + Math.random().toString(36).substr(2, 6));
      const userId = params.registeredUserId ?? String(Math.floor(100000 + Math.random() * 900000));
      const username = trimmedName.toLowerCase().replace(/\s+/g, "_");

      const url = new URL("/api/users/sync", getApiUrl());
      await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id, userId, name: trimmedName, username,
          email: params.email,
          language, method,
          onboardingComplete: true,
        }),
      });

      await login({
        id, userId,
        name: trimmedName,
        email: params.email,
        language: language as any,
        onboardingComplete: true,
      });
      router.replace("/(tabs)/explore");
    } catch {
      setLoading(false);
    }
  };

  const canSubmit = name.trim().length >= 2 && !loading;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#333" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <View style={styles.methodBadge}>
              {isApple ? (
                <Ionicons name="logo-apple" size={20} color="#000" />
              ) : isEmail ? (
                <Feather name="mail" size={18} color="#555" />
              ) : (
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
              )}
              <Text style={styles.methodLabel}>
                {isApple ? "Apple" : isEmail ? "E-posta" : "Google"} ile devam ediliyor
              </Text>
            </View>

            <Text style={styles.title}>Adın ne?</Text>
            <Text style={styles.subtitle}>Soulie sana bu isimle hitap edecek.</Text>

            <View style={styles.inputWrapper}>
              <TextInput
                ref={nameRef}
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="İsmin"
                placeholderTextColor="rgba(0,0,0,0.3)"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                maxLength={30}
              />
            </View>

            <Text style={styles.langLabel}>Dil tercihi</Text>
            <Pressable style={styles.langPicker} onPress={() => setShowLangPicker((v) => !v)}>
              <Text style={styles.langPickerText}>
                {selectedLang.flag}  {selectedLang.label}
              </Text>
              <Feather name={showLangPicker ? "chevron-up" : "chevron-down"} size={18} color="#666" />
            </Pressable>

            {showLangPicker && (
              <View style={styles.langDropdown}>
                {LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang.code}
                    style={[styles.langOption, language === lang.code && styles.langOptionActive]}
                    onPress={() => {
                      setLanguage(lang.code);
                      setShowLangPicker(false);
                    }}
                  >
                    <Text style={styles.langOptionText}>{lang.flag}  {lang.label}</Text>
                    {language === lang.code && <Feather name="check" size={16} color={ACCENT} />}
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: botPad }]}>
        <Pressable
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.btnText}>Giriş Yap</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 20,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 28,
  },
  methodLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#555",
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
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#111",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#888",
    marginBottom: 32,
    lineHeight: 23,
  },
  inputWrapper: {
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  nameInput: {
    paddingVertical: 18,
    fontSize: 20,
    fontFamily: "Inter_500Medium",
    color: "#111",
  },
  langLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#555",
    marginBottom: 8,
  },
  langPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  langPickerText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#111",
  },
  langDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0F0",
  },
  langOptionActive: {
    backgroundColor: "rgba(108,92,231,0.06)",
  },
  langOptionText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#222",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
