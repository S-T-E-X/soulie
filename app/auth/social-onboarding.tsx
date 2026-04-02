import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Animated,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth, UserGender, UserLanguage } from "@/contexts/AuthContext";
import { getTranslation, AppLanguage } from "@/constants/i18n";
import { getApiUrl } from "@/lib/query-client";

const { width } = Dimensions.get("window");
const ACCENT = "#6C5CE7";
const TOTAL_STEPS = 4;

type OnboardingData = {
  language: UserLanguage;
  name: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: UserGender | null;
};

function tb(lang: UserLanguage, key: string) {
  return getTranslation(lang as AppLanguage, key);
}

const LANGUAGES: { code: UserLanguage; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i < step ? styles.progressDotActive : {},
          ]}
        />
      ))}
    </View>
  );
}

function NameLanguagePage({
  data,
  onNameChange,
  onLangChange,
  method,
}: {
  data: OnboardingData;
  onNameChange: (v: string) => void;
  onLangChange: (v: UserLanguage) => void;
  method: string;
}) {
  const [showLangPicker, setShowLangPicker] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const isApple = method === "apple";
  const isEmail = method === "email";
  const selectedLang = LANGUAGES.find((l) => l.code === data.language) ?? LANGUAGES[0];

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 400);
  }, []);

  return (
    <View style={styles.pageContent}>
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
          {isApple ? "Apple" : isEmail ? "Email" : "Google"}
        </Text>
      </View>

      <Text style={styles.pageTitle}>{tb(data.language, "onboarding.whatIsYourName")}</Text>
      <Text style={styles.pageSubtitle}>{tb(data.language, "onboarding.nameSubtitle")}</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          ref={nameRef}
          style={styles.nameInput}
          value={data.name}
          onChangeText={onNameChange}
          placeholder={tb(data.language, "onboarding.namePlaceholder")}
          placeholderTextColor="rgba(0,0,0,0.3)"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          maxLength={30}
        />
      </View>

      <Text style={styles.langLabel}>{tb(data.language, "onboarding.selectLanguage")}</Text>
      <Pressable style={styles.langPicker} onPress={() => setShowLangPicker((v) => !v)}>
        <Text style={styles.langPickerText}>
          {selectedLang.flag}{"  "}{selectedLang.label}
        </Text>
        <Feather name={showLangPicker ? "chevron-up" : "chevron-down"} size={18} color="#666" />
      </Pressable>

      {showLangPicker && (
        <View style={styles.langDropdown}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              style={[styles.langOption, data.language === lang.code && styles.langOptionActive]}
              onPress={() => {
                onLangChange(lang.code);
                setShowLangPicker(false);
              }}
            >
              <Text style={styles.langOptionText}>{lang.flag}{"  "}{lang.label}</Text>
              {data.language === lang.code && <Feather name="check" size={16} color={ACCENT} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function BirthdatePage({
  data,
  onDay,
  onMonth,
  onYear,
}: {
  data: OnboardingData;
  onDay: (v: string) => void;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
}) {
  return (
    <View style={styles.pageContent}>
      <Text style={styles.pageTitle}>{tb(data.language, "onboarding.whenBorn")}</Text>
      <Text style={styles.pageSubtitle}>{tb(data.language, "onboarding.birthdaySubtitle")}</Text>
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>{tb(data.language, "onboarding.day")}</Text>
          <TextInput
            style={styles.dateInput}
            value={data.birthDay}
            onChangeText={(v) => onDay(v.replace(/[^0-9]/g, "").slice(0, 2))}
            placeholder="DD"
            placeholderTextColor="rgba(0,0,0,0.3)"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>{tb(data.language, "onboarding.month")}</Text>
          <TextInput
            style={styles.dateInput}
            value={data.birthMonth}
            onChangeText={(v) => onMonth(v.replace(/[^0-9]/g, "").slice(0, 2))}
            placeholder="MM"
            placeholderTextColor="rgba(0,0,0,0.3)"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={[styles.dateField, { flex: 1.4 }]}>
          <Text style={styles.dateLabel}>{tb(data.language, "onboarding.year")}</Text>
          <TextInput
            style={styles.dateInput}
            value={data.birthYear}
            onChangeText={(v) => onYear(v.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder="YYYY"
            placeholderTextColor="rgba(0,0,0,0.3)"
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>
    </View>
  );
}

function GenderPage({
  data,
  onSelect,
}: {
  data: OnboardingData;
  onSelect: (g: UserGender) => void;
}) {
  const options: { key: UserGender; icon: string; labelKey: string }[] = [
    { key: "male", icon: "man", labelKey: "onboarding.male" },
    { key: "female", icon: "woman", labelKey: "onboarding.female" },
    { key: "other", icon: "person", labelKey: "onboarding.other" },
    { key: "prefer_not_to_say", icon: "help-circle", labelKey: "onboarding.other" },
  ];

  return (
    <View style={styles.pageContent}>
      <Text style={styles.pageTitle}>{tb(data.language, "onboarding.gender")}</Text>
      <Text style={styles.pageSubtitle}>{tb(data.language, "onboarding.genderSubtitle")}</Text>
      <View style={styles.genderContainer}>
        {options.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.genderCard, data.gender === opt.key && styles.genderCardSelected]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(opt.key);
            }}
          >
            <Ionicons
              name={opt.icon as any}
              size={24}
              color={data.gender === opt.key ? "#fff" : "#555"}
            />
            <Text style={[styles.genderLabel, data.gender === opt.key && styles.genderLabelSelected]}>
              {tb(data.language, opt.labelKey)}
            </Text>
            {data.gender === opt.key && (
              <Feather name="check" size={16} color="#fff" style={styles.genderCheck} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ProcessingPage({
  data,
  registeredId,
  registeredEmail,
  registeredUserId,
  method,
}: {
  data: OnboardingData;
  registeredId?: string;
  registeredEmail?: string;
  registeredUserId?: string;
  method: string;
}) {
  const { login } = useAuth();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  const processingSteps: Record<AppLanguage, string[]> = {
    en: ["Saving your profile information", "Personalizing characters", "Preparing your chat experience"],
    tr: ["Profil bilgilerin kaydediliyor", "Karakterler kişiselleştiriliyor", "Sohbet deneyimin hazırlanıyor"],
    de: ["Profildaten werden gespeichert", "Charaktere werden personalisiert", "Chat-Erlebnis wird vorbereitet"],
    zh: ["保存您的个人资料", "个性化角色", "准备聊天体验"],
    ko: ["프로필 정보 저장 중", "캐릭터 개인화 중", "채팅 경험 준비 중"],
    es: ["Guardando tu información de perfil", "Personalizando personajes", "Preparando tu experiencia de chat"],
    ru: ["Сохранение данных профиля", "Персонализация персонажей", "Подготовка опыта общения"],
  };

  const lang = (data.language as AppLanguage) in processingSteps ? (data.language as AppLanguage) : "en";
  const steps = processingSteps[lang];

  const creatingTitle: Record<AppLanguage, string> = {
    en: "Creating Your Profile", tr: "Profil Oluşturuluyor",
    de: "Profil wird erstellt", zh: "正在创建您的资料",
    ko: "프로필 만드는 중", es: "Creando tu perfil", ru: "Создание профиля",
  };
  const creatingSubtitle: Record<AppLanguage, string> = {
    en: "We're preparing the best experience for you...", tr: "Senin için en iyi deneyimi hazırlıyoruz...",
    de: "Wir bereiten das beste Erlebnis für dich vor...", zh: "我们正在为您准备最佳体验...",
    ko: "최고의 경험을 준비하고 있습니다...", es: "Estamos preparando la mejor experiencia para ti...",
    ru: "Мы готовим лучший опыт для тебя...",
  };
  const welcomeMsg: Record<AppLanguage, (name: string) => string> = {
    en: (n) => `Welcome, ${n}!`, tr: (n) => `Hoş Geldin, ${n}!`,
    de: (n) => `Willkommen, ${n}!`, zh: (n) => `欢迎，${n}！`,
    ko: (n) => `환영합니다, ${n}!`, es: (n) => `¡Bienvenido/a, ${n}!`,
    ru: (n) => `Добро пожаловать, ${n}!`,
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      if (step >= steps.length) {
        clearInterval(interval);
        setTimeout(async () => {
          try {
            const id = registeredId ?? ("u_" + Date.now().toString() + Math.random().toString(36).substr(2, 6));
            const userId = registeredUserId ?? String(Math.floor(100000 + Math.random() * 900000));
            const username = (data.name || "user").toLowerCase().replace(/\s+/g, "_");
            const birthdate =
              data.birthDay && data.birthMonth && data.birthYear
                ? `${data.birthYear}-${data.birthMonth.padStart(2, "0")}-${data.birthDay.padStart(2, "0")}`
                : undefined;

            const url = new URL("/api/users/sync", getApiUrl());
            await fetch(url.toString(), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id, userId, name: data.name || "User", username,
                email: registeredEmail,
                language: data.language,
                method,
                birthdate,
                gender: data.gender ?? undefined,
                onboardingComplete: true,
              }),
            });

            await login({
              id, userId,
              name: data.name || "User",
              email: registeredEmail,
              language: data.language,
              birthdate,
              gender: data.gender ?? undefined,
              onboardingComplete: true,
            });
          } catch {}
          setDone(true);
          setTimeout(() => {
            router.replace("/(tabs)/explore");
          }, 800);
        }, 600);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Animated.View style={[styles.processingPage, { opacity: fadeAnim }]}>
      {!done ? (
        <>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
            <View style={styles.spinnerInner} />
          </Animated.View>
          <Text style={styles.processingTitle}>{creatingTitle[lang]}</Text>
          <Text style={styles.processingSubtitle}>{creatingSubtitle[lang]}</Text>
          <View style={styles.stepList}>
            {steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepIcon, i < currentStep && styles.stepIconDone]}>
                  {i < currentStep ? (
                    <Feather name="check" size={12} color="#fff" />
                  ) : i === currentStep ? (
                    <View style={styles.stepDot} />
                  ) : (
                    <View style={styles.stepDotEmpty} />
                  )}
                </View>
                <Text style={[styles.stepText, i < currentStep && styles.stepTextDone]}>{s}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.doneIcon}>
            <Feather name="check" size={36} color="#fff" />
          </View>
          <Text style={styles.processingTitle}>{welcomeMsg[lang](data.name)}</Text>
        </>
      )}
    </Animated.View>
  );
}

export default function SocialOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ method?: string; email?: string; registeredId?: string; registeredUserId?: string; prefillName?: string }>();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 16;
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16;

  const method = params.method ?? "google";
  const hasAppleName = method === "apple" && !!params.prefillName?.trim();
  const minStep = hasAppleName ? 2 : 1;

  const [step, setStep] = useState(minStep);
  const [data, setData] = useState<OnboardingData>({
    language: "en",
    name: params.prefillName?.trim() ?? "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    gender: null,
  });

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    slideAnim.setValue(width * 0.3);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 100,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const goNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step === 1) {
      if (data.name.trim().length < 2) return;
    }

    if (step === 2) {
      const d = parseInt(data.birthDay, 10);
      const m = parseInt(data.birthMonth, 10);
      const y = parseInt(data.birthYear, 10);
      if (!data.birthDay || !data.birthMonth || !data.birthYear || data.birthYear.length < 4) {
        const titles: Record<AppLanguage, string> = {
          en: "Birthdate Required", tr: "Doğum Tarihi Gerekli",
          de: "Geburtsdatum erforderlich", zh: "需要出生日期",
          ko: "생년월일 필요", es: "Fecha de nacimiento requerida", ru: "Требуется дата рождения",
        };
        const msgs: Record<AppLanguage, string> = {
          en: "Please enter your complete birthdate.", tr: "Lütfen doğum tarihini eksiksiz gir.",
          de: "Bitte gib dein vollständiges Geburtsdatum ein.", zh: "请输入完整的出生日期。",
          ko: "완전한 생년월일을 입력해 주세요.", es: "Por favor ingresa tu fecha de nacimiento completa.", ru: "Пожалуйста, введи полную дату рождения.",
        };
        const l = (data.language as AppLanguage) in titles ? (data.language as AppLanguage) : "en";
        Alert.alert(titles[l], msgs[l]);
        return;
      }
      const birth = new Date(y, m - 1, d);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
      if (isNaN(age) || age < 18) {
        const ageTitles: Record<AppLanguage, string> = {
          en: "Age Restriction", tr: "Yaş Sınırı",
          de: "Altersbeschränkung", zh: "年龄限制",
          ko: "나이 제한", es: "Restricción de edad", ru: "Ограничение по возрасту",
        };
        const ageMsgs: Record<AppLanguage, string> = {
          en: "Soulie is only available for users aged 18 and above.", tr: "Soulie yalnızca 18 yaş ve üzeri kullanıcılara yöneliktir.",
          de: "Soulie ist nur für Nutzer ab 18 Jahren verfügbar.", zh: "Soulie仅适用于18岁及以上用户。",
          ko: "Soulie는 18세 이상만 이용할 수 있습니다.", es: "Soulie solo está disponible para usuarios de 18 años o más.",
          ru: "Soulie доступен только пользователям от 18 лет.",
        };
        const l = (data.language as AppLanguage) in ageTitles ? (data.language as AppLanguage) : "en";
        Alert.alert(ageTitles[l], ageMsgs[l]);
        return;
      }
    }

    if (step === 3 && !data.gender) return;

    setStep((s) => s + 1);
    animateIn();
  };

  const goBack = () => {
    if (step <= minStep) {
      router.back();
      return;
    }
    setStep((s) => s - 1);
    animateIn();
  };

  const canProceed = () => {
    if (step === 1) return data.name.trim().length >= 2;
    if (step === 2) return !!(data.birthDay && data.birthMonth && data.birthYear && data.birthYear.length === 4);
    if (step === 3) return !!data.gender;
    return false;
  };

  const nextLabel: Record<AppLanguage, string> = {
    en: "Continue", tr: "Devam Et", de: "Weiter",
    zh: "继续", ko: "계속", es: "Continuar", ru: "Продолжить",
  };
  const lang = (data.language as AppLanguage) in nextLabel ? (data.language as AppLanguage) : "en";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={goBack}>
          <Feather name="arrow-left" size={22} color="#333" />
        </Pressable>
        {step < TOTAL_STEPS && <ProgressBar step={step} />}
        <View style={styles.backBtn} />
      </View>

      {step < TOTAL_STEPS ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
              {step === 1 && (
                <NameLanguagePage
                  data={data}
                  onNameChange={(v) => setData((d) => ({ ...d, name: v }))}
                  onLangChange={(v) => setData((d) => ({ ...d, language: v }))}
                  method={method}
                />
              )}
              {step === 2 && (
                <BirthdatePage
                  data={data}
                  onDay={(v) => setData((d) => ({ ...d, birthDay: v }))}
                  onMonth={(v) => setData((d) => ({ ...d, birthMonth: v }))}
                  onYear={(v) => setData((d) => ({ ...d, birthYear: v }))}
                />
              )}
              {step === 3 && (
                <GenderPage
                  data={data}
                  onSelect={(g) => setData((d) => ({ ...d, gender: g }))}
                />
              )}
            </Animated.View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: botPad }]}>
            <Pressable
              style={[styles.btn, !canProceed() && styles.btnDisabled]}
              onPress={goNext}
              disabled={!canProceed()}
            >
              <Text style={styles.btnText}>{nextLabel[lang]}</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <ProcessingPage
          data={data}
          registeredId={params.registeredId}
          registeredEmail={params.email}
          registeredUserId={params.registeredUserId}
          method={method}
        />
      )}
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
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  progressDot: {
    width: 28,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E5E5",
  },
  progressDotActive: {
    backgroundColor: ACCENT,
  },
  pageContent: {
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
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#888",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateInput: {
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    color: "#111",
    textAlign: "center",
  },
  genderContainer: {
    gap: 12,
    marginTop: 8,
  },
  genderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  genderCardSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  genderLabel: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Inter_500Medium",
    color: "#333",
  },
  genderLabelSelected: {
    color: "#fff",
  },
  genderCheck: {
    marginLeft: "auto",
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
  processingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  spinner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: ACCENT,
    borderTopColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  spinnerInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ACCENT,
    opacity: 0.3,
  },
  processingTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#111",
    textAlign: "center",
    marginBottom: 8,
  },
  processingSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#888",
    textAlign: "center",
    marginBottom: 36,
    lineHeight: 22,
  },
  stepList: {
    width: "100%",
    gap: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconDone: {
    backgroundColor: ACCENT,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  stepDotEmpty: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CCC",
  },
  stepText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#888",
  },
  stepTextDone: {
    color: "#111",
    fontFamily: "Inter_500Medium",
  },
  doneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
});
