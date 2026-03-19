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
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password Too Short", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "The passwords you entered don't match.");
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
          "Email Already Registered",
          "This email is already registered. Would you like to log in?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Log In", onPress: () => setMode("login") },
          ]
        );
        return;
      }
      if (!res.ok) {
        Alert.alert("Error", "Something went wrong during registration. Please try again.");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: "/auth/social-onboarding",
        params: { method: "email", email: trimmedEmail, registeredId: data.id, registeredUserId: data.userId },
      });
    } catch {
      Alert.alert("Connection Error", "Couldn't connect to the server. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    if (!password) {
      Alert.alert("Password Required", "Please enter your password.");
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
            ? "No account found with this email."
            : data.error === "wrong_password"
            ? "Incorrect password. Try again."
            : "Login failed.";
        Alert.alert("Login Error", msg);
        return;
      }
      if (!res.ok) {
        Alert.alert("Error", "Something went wrong during login.");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await login({ ...data.user, onboardingComplete: data.user.onboardingComplete ?? true });
      router.replace("/(tabs)/explore");
    } catch {
      Alert.alert("Connection Error", "Couldn't connect to the server.");
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
              {isRegister ? "Create Account" : "Log In"}
            </Text>
            <Text style={styles.pageSubtitle}>
              {isRegister
                ? "Continue with your email and password."
                : "Log in with your email and password."}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Feather name="mail" size={18} color="#999" style={styles.inputIcon} />
                <TextInput
                  ref={emailRef}
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
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
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Feather name="lock" size={18} color="#999" style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.textInput, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
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
                <Text style={styles.fieldLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={18} color="#999" style={styles.inputIcon} />
                  <TextInput
                    ref={confirmRef}
                    style={[styles.textInput, { flex: 1 }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm your password"
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
                  <Text style={styles.errorText}>Passwords don't match</Text>
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
                {isRegister ? "Continue" : "Log In"}
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
              ? "Already have an account? Log in"
              : "Don't have an account? Sign up"}
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
