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
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth, UserGender, UserLanguage } from "@/contexts/AuthContext";

const { width } = Dimensions.get("window");
const TOTAL_STEPS = 5;

type OnboardingData = {
  language: UserLanguage;
  name: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  gender: UserGender | null;
};

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.progressDot,
            i < step ? styles.progressDotActive : i === step - 1 ? styles.progressDotCurrent : {},
          ]}
        />
      ))}
    </View>
  );
}

function LanguagePage({
  selected,
  onSelect,
}: {
  selected: UserLanguage;
  onSelect: (l: UserLanguage) => void;
}) {
  const langs: { key: UserLanguage; label: string; flag: string }[] = [
    { key: "tr", label: "Türkçe", flag: "🇹🇷" },
    { key: "en", label: "English", flag: "🇬🇧" },
  ];
  return (
    <View style={styles.pageContent}>
      <Text style={styles.pageTitle}>Dilini Seç</Text>
      <Text style={styles.pageSubtitle}>Soulie seninle hangi dilde konuşsun?</Text>
      <View style={styles.langContainer}>
        {langs.map((l) => (
          <Pressable
            key={l.key}
            style={[styles.langCard, selected === l.key && styles.langCardSelected]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(l.key);
            }}
          >
            <Text style={styles.langFlag}>{l.flag}</Text>
            <Text style={[styles.langLabel, selected === l.key && styles.langLabelSelected]}>
              {l.label}
            </Text>
            {selected === l.key && (
              <View style={styles.langCheck}>
                <Feather name="check" size={16} color="#fff" />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function NamePage({
  name,
  onChangeName,
  language,
}: {
  name: string;
  onChangeName: (v: string) => void;
  language: UserLanguage;
}) {
  const titles = { tr: "Adın ne?", en: "What's your name?" };
  const subtitles = { tr: "Seni nasıl çağıralım?", en: "How should we address you?" };
  const placeholders = { tr: "Adını yaz...", en: "Enter your name..." };

  return (
    <View style={styles.pageContent}>
      <Text style={styles.pageTitle}>{titles[language]}</Text>
      <Text style={styles.pageSubtitle}>{subtitles[language]}</Text>
      <TextInput
        style={styles.textInput}
        value={name}
        onChangeText={onChangeName}
        placeholder={placeholders[language]}
        placeholderTextColor="rgba(0,0,0,0.3)"
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        maxLength={30}
      />
    </View>
  );
}

function BirthdatePage({
  day,
  month,
  year,
  onDay,
  onMonth,
  onYear,
  language,
}: {
  day: string;
  month: string;
  year: string;
  onDay: (v: string) => void;
  onMonth: (v: string) => void;
  onYear: (v: string) => void;
  language: UserLanguage;
}) {
  const titles = { tr: "Ne zaman doğdun?", en: "When were you born?" };
  const subtitles = {
    tr: "Yaşın deneyimini kişiselleştirir",
    en: "Your age helps personalize your experience",
  };
  return (
    <View style={styles.pageContent}>
      <Text style={styles.pageTitle}>{titles[language]}</Text>
      <Text style={styles.pageSubtitle}>{subtitles[language]}</Text>
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>{language === "tr" ? "Gün" : "Day"}</Text>
          <TextInput
            style={styles.dateInput}
            value={day}
            onChangeText={(v) => onDay(v.replace(/[^0-9]/g, "").slice(0, 2))}
            placeholder="DD"
            placeholderTextColor="rgba(0,0,0,0.3)"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>{language === "tr" ? "Ay" : "Month"}</Text>
          <TextInput
            style={styles.dateInput}
            value={month}
            onChangeText={(v) => onMonth(v.replace(/[^0-9]/g, "").slice(0, 2))}
            placeholder="MM"
            placeholderTextColor="rgba(0,0,0,0.3)"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={[styles.dateField, { flex: 1.4 }]}>
          <Text style={styles.dateLabel}>{language === "tr" ? "Yıl" : "Year"}</Text>
          <TextInput
            style={styles.dateInput}
            value={year}
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
  selected,
  onSelect,
  language,
}: {
  selected: UserGender | null;
  onSelect: (g: UserGender) => void;
  language: UserLanguage;
}) {
  const options: { key: UserGender; tr: string; en: string; icon: string }[] = [
    { key: "male", tr: "Erkek", en: "Male", icon: "man" },
    { key: "female", tr: "Kadın", en: "Female", icon: "woman" },
    { key: "other", tr: "Diğer", en: "Other", icon: "person" },
    { key: "prefer_not_to_say", tr: "Belirtmek İstemiyorum", en: "Prefer not to say", icon: "help-circle" },
  ];

  return (
    <View style={styles.pageContent}>
      <Text style={styles.pageTitle}>
        {language === "tr" ? "Cinsiyetin ne?" : "What's your gender?"}
      </Text>
      <Text style={styles.pageSubtitle}>
        {language === "tr"
          ? "Bu bilgi sohbetleri kişiselleştirmek için kullanılır"
          : "This is used to personalize your conversations"}
      </Text>
      <View style={styles.genderContainer}>
        {options.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.genderCard, selected === opt.key && styles.genderCardSelected]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(opt.key);
            }}
          >
            <Ionicons
              name={opt.icon as any}
              size={24}
              color={selected === opt.key ? "#fff" : "#555"}
            />
            <Text style={[styles.genderLabel, selected === opt.key && styles.genderLabelSelected]}>
              {language === "tr" ? opt.tr : opt.en}
            </Text>
            {selected === opt.key && (
              <Feather name="check" size={16} color="#fff" style={styles.genderCheck} />
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ProcessingPage({ language, data }: { language: UserLanguage; data: OnboardingData }) {
  const { login } = useAuth();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  const steps =
    language === "tr"
      ? ["Profil bilgilerin kaydediliyor", "Karakterler kişiselleştiriliyor", "Sohbet deneyimin hazırlanıyor"]
      : ["Saving your profile information", "Personalizing characters", "Preparing your chat experience"];

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
          const birthdate =
            data.birthDay && data.birthMonth && data.birthYear
              ? `${data.birthYear}-${data.birthMonth.padStart(2, "0")}-${data.birthDay.padStart(2, "0")}`
              : undefined;
          await login({
            name: data.name || (language === "tr" ? "Kullanıcı" : "User"),
            language: data.language,
            birthdate,
            gender: data.gender ?? undefined,
            onboardingComplete: true,
          });
          setDone(true);
          setTimeout(() => {
            router.replace("/(tabs)/explore");
          }, 800);
        }, 600);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={[styles.processingPage, { opacity: fadeAnim }]}>
      {!done ? (
        <>
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
            <View style={styles.spinnerInner} />
          </Animated.View>
          <Text style={styles.processingTitle}>
            {language === "tr" ? "Profil Oluşturuluyor" : "Creating Your Profile"}
          </Text>
          <Text style={styles.processingSubtitle}>
            {language === "tr"
              ? "Senin için en iyi deneyimi hazırlıyoruz..."
              : "We're preparing the best experience for you..."}
          </Text>
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
                <Text style={[styles.stepText, i < currentStep && styles.stepTextDone]}>
                  {s}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.doneIcon}>
            <Feather name="check" size={36} color="#fff" />
          </View>
          <Text style={styles.processingTitle}>
            {language === "tr" ? `Hoş Geldin, ${data.name}!` : `Welcome, ${data.name}!`}
          </Text>
        </>
      )}
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    language: "tr",
    name: "",
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
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      animateIn();
    }
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) {
      setStep((s) => s - 1);
      animateIn();
    } else {
      router.back();
    }
  };

  const canContinue = () => {
    if (step === 1) return true;
    if (step === 2) return data.name.trim().length >= 2;
    if (step === 3) return true;
    if (step === 4) return data.gender !== null;
    return true;
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0) + 16;
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {step < TOTAL_STEPS && (
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={goBack}>
            <Feather name="arrow-left" size={22} color="#333" />
          </Pressable>
          <ProgressBar step={step} />
          <View style={styles.backBtn} />
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
            {step === 1 && (
              <LanguagePage
                selected={data.language}
                onSelect={(l) => setData((d) => ({ ...d, language: l }))}
              />
            )}
            {step === 2 && (
              <NamePage
                name={data.name}
                onChangeName={(v) => setData((d) => ({ ...d, name: v }))}
                language={data.language}
              />
            )}
            {step === 3 && (
              <BirthdatePage
                day={data.birthDay}
                month={data.birthMonth}
                year={data.birthYear}
                onDay={(v) => setData((d) => ({ ...d, birthDay: v }))}
                onMonth={(v) => setData((d) => ({ ...d, birthMonth: v }))}
                onYear={(v) => setData((d) => ({ ...d, birthYear: v }))}
                language={data.language}
              />
            )}
            {step === 4 && (
              <GenderPage
                selected={data.gender}
                onSelect={(g) => setData((d) => ({ ...d, gender: g }))}
                language={data.language}
              />
            )}
            {step === 5 && <ProcessingPage language={data.language} data={data} />}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {step < TOTAL_STEPS && (
        <View style={[styles.footer, { paddingBottom: botPad }]}>
          {step === 3 && (
            <Pressable style={styles.skipBtn} onPress={goNext}>
              <Text style={styles.skipText}>
                {data.language === "tr" ? "Atla" : "Skip"}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.continueBtn, !canContinue() && styles.continueBtnDisabled]}
            onPress={canContinue() ? goNext : undefined}
          >
            <Text style={styles.continueBtnText}>
              {data.language === "tr" ? "Devam Et" : "Continue"}
            </Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const ACCENT = "#6C5CE7";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
  progressContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  progressDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E5E5",
  },
  progressDotActive: {
    backgroundColor: ACCENT,
  },
  progressDotCurrent: {
    backgroundColor: ACCENT,
    opacity: 0.5,
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
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
  langContainer: {
    gap: 14,
  },
  langCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    gap: 14,
  },
  langCardSelected: {
    borderColor: ACCENT,
    backgroundColor: `${ACCENT}10`,
  },
  langFlag: {
    fontSize: 28,
  },
  langLabel: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: "#333",
  },
  langLabelSelected: {
    color: ACCENT,
  },
  langCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    color: "#111",
    backgroundColor: "#FAFAFA",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateField: {
    flex: 1,
    gap: 8,
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#888",
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 14,
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    color: "#111",
    backgroundColor: "#FAFAFA",
    textAlign: "center",
  },
  genderContainer: {
    gap: 12,
  },
  genderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    gap: 14,
  },
  genderCardSelected: {
    borderColor: ACCENT,
    backgroundColor: ACCENT,
  },
  genderLabel: {
    flex: 1,
    fontSize: 16,
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
    gap: 10,
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#AAA",
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
  continueBtnDisabled: {
    opacity: 0.4,
  },
  continueBtnText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  processingPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  spinner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: ACCENT,
    borderTopColor: "transparent",
    marginBottom: 8,
  },
  spinnerInner: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: `${ACCENT}40`,
    borderTopColor: "transparent",
  },
  processingTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#111",
    textAlign: "center",
  },
  processingSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#888",
    textAlign: "center",
  },
  stepList: {
    width: "100%",
    gap: 14,
    marginTop: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    color: "#BBB",
  },
  stepTextDone: {
    color: "#333",
  },
  doneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
});
