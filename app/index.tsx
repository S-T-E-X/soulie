import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={inputStyles.wrapper}>
      <Text style={inputStyles.label}>{label}</Text>
      <View style={[inputStyles.container, focused && inputStyles.focused]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text.tertiary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          style={inputStyles.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardAppearance="light"
        />
      </View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text.secondary,
    letterSpacing: -0.1,
  },
  container: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  focused: {
    borderColor: Colors.accent,
    backgroundColor: "#FFFFFF",
  },
  input: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text.primary,
    letterSpacing: -0.1,
  },
});

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { register, login, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)/explore");
    }
  }, [isAuthenticated]);

  const buttonScale = useSharedValue(1);
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Tüm alanları doldur.");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("İsim alanını doldur.");
      return;
    }

    buttonScale.value = withSpring(0.95, { damping: 12 }, () => {
      buttonScale.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setLoading(true);
    try {
      if (mode === "register") {
        await register(name.trim(), username.trim().toLowerCase(), password);
      } else {
        await login(username.trim().toLowerCase(), password);
      }
      router.replace("/(tabs)/explore");
    } catch (e: any) {
      setError(e.message || "Bir hata oluştu.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#E8EFF8", "#F2F2F7", "#EEF1F8"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob1]} />
      <View style={[styles.blob2]} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.hero}>
          <LinearGradient colors={["#4FC3F7", "#007AFF"]} style={styles.logoOrb} />
          <Text style={styles.appName}>Lumina</Text>
          <Text style={styles.appTagline}>AI Arkadaşlarınla Tanış</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(100).springify().damping(18)}
          style={styles.card}
        >
          <View style={styles.modeToggle}>
            <Pressable
              onPress={() => { setMode("register"); setError(""); }}
              style={[styles.modeBtn, mode === "register" && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, mode === "register" && styles.modeBtnTextActive]}>
                Kayıt Ol
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setMode("login"); setError(""); }}
              style={[styles.modeBtn, mode === "login" && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, mode === "login" && styles.modeBtnTextActive]}>
                Giriş Yap
              </Text>
            </Pressable>
          </View>

          <View style={styles.form}>
            {mode === "register" ? (
              <InputField
                label="İsmin"
                value={name}
                onChangeText={setName}
                placeholder="Adın ne?"
              />
            ) : null}
            <InputField
              label="Kullanıcı Adı"
              value={username}
              onChangeText={setUsername}
              placeholder="kullanici_adi"
            />
            <InputField
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Animated.View style={buttonStyle}>
            <Pressable onPress={handleSubmit} disabled={loading} style={styles.submitButton}>
              <LinearGradient
                colors={[Colors.userBubble.from, Colors.userBubble.to]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === "register" ? "Hadi Başlayalım" : "Giriş Yap"}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.Text
          entering={FadeInUp.delay(200).springify().damping(18)}
          style={styles.disclaimer}
        >
          Devam ederek gizlilik politikamızı kabul etmiş olursunuz.
        </Animated.Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    flexGrow: 1,
    justifyContent: "center",
  },
  blob1: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -80,
    right: -80,
    backgroundColor: "rgba(0, 122, 255, 0.07)",
  },
  blob2: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: 100,
    left: -60,
    backgroundColor: "rgba(88, 86, 214, 0.05)",
  },
  hero: {
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  logoOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 4,
  },
  appName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -1,
  },
  appTagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    gap: 20,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text.secondary,
  },
  modeBtnTextActive: {
    color: Colors.text.primary,
    fontFamily: "Inter_600SemiBold",
  },
  form: { gap: 14 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,59,48,0.08)",
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#FF3B30",
    flex: 1,
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
    textAlign: "center",
    marginTop: 16,
  },
});
