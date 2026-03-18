import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

const ACCENT = "#6C5CE7";

export default function EmailRegisterScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ prefill?: string }>();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"register" | "login">("register");

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 16;
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16;

  const validateEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleRegister = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      Alert.alert("Geçersiz E-posta", "Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Şifre Kısa", "Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Şifre Eşleşmiyor", "Girdiğiniz şifreler uyuşmuyor.");
      return;
    }

    setLoading(true);
    try {
      const url = new URL("/api/auth/email-register", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const data = await res.json();

      if (res.status === 409) {
        Alert.alert(
          "E-posta Kayıtlı",
          "Bu e-posta zaten kayıtlı. Giriş yapmak ister misiniz?",
          [
            { text: "İptal", style: "cancel" },
            { text: "Giriş Yap", onPress: () => setMode("login") },
          ]
        );
        return;
      }
      if (!res.ok) {
        Alert.alert("Hata", "Kayıt sırasında bir sorun oluştu. Tekrar deneyin.");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: "/auth/social-onboarding",
        params: { method: "email", email: trimmedEmail, registeredId: data.id, registeredUserId: data.userId },
      });
    } catch {
      Alert.alert("Bağlantı Hatası", "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      Alert.alert("Geçersiz E-posta", "Lütfen geçerli bir e-posta adresi girin.");
      return;
    }
    if (!password) {
      Alert.alert("Şifre Gerekli", "Lütfen şifrenizi girin.");
      return;
    }

    setLoading(true);
    try {
      const url = new URL("/api/auth/email-login", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const data = await res.json();

      if (res.status === 401) {
        const msg =
          data.error === "not_found"
            ? "Bu e-posta ile kayıtlı hesap bulunamadı."
            : data.error === "wrong_password"
            ? "Şifre hatalı. Tekrar deneyin."
            : "Giriş başarısız.";
        Alert.alert("Giriş Hatası", msg);
        return;
      }
      if (!res.ok) {
        Alert.alert("Hata", "Giriş sırasında bir sorun oluştu.");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await login({ ...data.user, onboardingComplete: data.user.onboardingComplete ?? true });
      router.replace("/(tabs)/explore");
    } catch {
      Alert.alert("Bağlantı Hatası", "Sunucuya bağlanılamadı.");
    } finally {
      setLoading(false);
    }
  };

  const isRegister = mode === "register";
  const canSubmit = isRegister
    ? !!email && !!password && !!confirmPassword && !loading
    : !!email && !!password && !loading;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#333" />
        </Pressable>
        <View style={{ flex: 1 }} />
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
          <View style={styles.pageContent}>
            <Text style={styles.pageTitle}>
              {isRegister ? "Hesap Oluştur" : "Giriş Yap"}
            </Text>
            <Text style={styles.pageSubtitle}>
              {isRegister
                ? "E-posta adresin ve şifrenle devam et."
                : "E-posta ve şifrenle giriş yap."}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>E-posta Adresi</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color="#999" style={styles.inputIcon} />
                <TextInput
                  ref={emailRef}
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ornek@email.com"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Şifre</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#999" style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.textInput, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="En az 6 karakter"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  secureTextEntry={!showPassword}
                  returnKeyType={isRegister ? "next" : "done"}
                  onSubmitEditing={() => isRegister ? confirmRef.current?.focus() : handleLogin()}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#999" />
                </Pressable>
              </View>
            </View>

            {isRegister && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Şifreyi Tekrarla</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={18} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={confirmRef}
                    style={[styles.textInput, { flex: 1 }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Şifreni tekrar gir"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    secureTextEntry={!showConfirm}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  <Pressable onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
                    <Feather name={showConfirm ? "eye-off" : "eye"} size={18} color="#999" />
                  </Pressable>
                </View>
                {!!confirmPassword && password !== confirmPassword && (
                  <Text style={styles.errorText}>Şifreler eşleşmiyor</Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: botPad }]}>
        <Pressable
          style={[styles.continueBtn, !canSubmit && styles.continueBtnDisabled]}
          onPress={isRegister ? handleRegister : handleLogin}
          disabled={!canSubmit}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueBtnText}>
                {isRegister ? "Devam Et" : "Giriş Yap"}
              </Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.switchBtn}
          onPress={() => {
            setMode(isRegister ? "login" : "register");
            setPassword("");
            setConfirmPassword("");
          }}
        >
          <Text style={styles.switchText}>
            {isRegister
              ? "Zaten hesabın var mı? Giriş yap"
              : "Hesabın yok mu? Kayıt ol"}
          </Text>
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
  pageContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#111",
    marginBottom: 10,
  },
  pageSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#888",
    marginBottom: 36,
    lineHeight: 23,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#555",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#111",
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#FF3B30",
    marginTop: 6,
    marginLeft: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  switchBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  switchText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: ACCENT,
  },
});
