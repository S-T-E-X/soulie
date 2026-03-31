import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { type CharacterSettings, type VoiceTone } from "@/hooks/useCharacterSettings";
import Colors from "@/constants/colors";
import { useI18n } from "@/hooks/useI18n";

const { height: SCREEN_H } = Dimensions.get("window");

export const AVAILABLE_TRAITS = [
  { id: "romantik", icon: "heart" as const },
  { id: "dinleyici", icon: "headphones" as const },
  { id: "koruyucu", icon: "shield" as const },
  { id: "disiplinli", icon: "zap" as const },
  { id: "entellektuel", icon: "book-open" as const },
  { id: "eglenceli", icon: "smile" as const },
  { id: "gizemli", icon: "moon" as const },
  { id: "sakaci", icon: "message-circle" as const },
];

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const VOICE_TONE_IDS: { id: VoiceTone; icon: FeatherIconName }[] = [
  { id: "warm", icon: "sun" },
  { id: "playful", icon: "smile" },
  { id: "serious", icon: "briefcase" },
  { id: "mysterious", icon: "moon" },
  { id: "energetic", icon: "zap" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  characterName: string;
  settings: CharacterSettings;
  isVip: boolean;
  onSave: (partial: Partial<CharacterSettings>) => void;
  onRemoveMemory: (index: number) => void;
}

export function CharacterCustomizeSheet({
  visible,
  onClose,
  characterName,
  settings,
  isVip,
  onSave,
  onRemoveMemory,
}: Props) {
  const { t } = useI18n();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [localName, setLocalName] = useState(settings.customName ?? "");
  const [localTraits, setLocalTraits] = useState<string[]>(settings.traits);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPremiumSheet, setShowPremiumSheet] = useState(false);
  const premiumAnim = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      setLocalName(settings.customName ?? "");
      setLocalTraits(settings.traits);
      setHasChanges(false);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 120 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (showPremiumSheet) {
      Animated.spring(premiumAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 120 }).start();
    } else {
      Animated.timing(premiumAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start();
    }
  }, [showPremiumSheet]);

  const toggleTrait = (id: string) => {
    if (!isVip) {
      onClose();
      router.push({ pathname: "/(tabs)/market", params: { tab: "premium" } });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalTraits((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
    setHasChanges(true);
  };

  const handleNameChange = (text: string) => {
    if (!isVip) return;
    setLocalName(text);
    setHasChanges(true);
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({ customName: localName.trim() || undefined, traits: localTraits });
    onClose();
  };

  const handleVipPress = () => {
    onClose();
    router.push({ pathname: "/(tabs)/market", params: { tab: "premium" } });
  };

  const handleVoiceToneSelect = (tone: VoiceTone) => {
    if (!isVip) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowPremiumSheet(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave({ voiceTone: settings.voiceTone === tone ? undefined : tone });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Platform.OS === "ios" ? (
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
            )}
          </View>
        </Pressable>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]} pointerEvents="box-none">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.sheetInner}>
              <View style={styles.handle} />

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{localName || characterName}</Text>
                <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                  <Feather name="x" size={18} color={Colors.text.secondary} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Feather name="edit-2" size={14} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>{t("char.customName")}</Text>
                    {!isVip && (
                      <Pressable onPress={handleVipPress} style={styles.vipChip}>
                        <Feather name="star" size={10} color="#FFD700" />
                        <Text style={styles.vipChipText}>Premium</Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={[styles.nameInput, !isVip && styles.lockedInput]}>
                    <TextInput
                      value={localName}
                      onChangeText={handleNameChange}
                      placeholder={characterName}
                      placeholderTextColor={Colors.text.tertiary}
                      style={styles.nameInputText}
                      editable={isVip}
                      maxLength={20}
                      returnKeyType="done"
                    />
                    {!isVip ? (
                      <Feather name="lock" size={15} color={Colors.text.tertiary} />
                    ) : (
                      <Feather name="edit-2" size={15} color={Colors.text.tertiary} />
                    )}
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Feather name="sliders" size={14} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>{t("char.personality")}</Text>
                    {!isVip && (
                      <Pressable onPress={handleVipPress} style={styles.vipChip}>
                        <Feather name="star" size={10} color="#FFD700" />
                        <Text style={styles.vipChipText}>Premium</Text>
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.sectionSub}>
                    {t("char.personalityDesc").replace("{name}", localName || characterName)}
                  </Text>
                  <View style={styles.traitsGrid}>
                    {AVAILABLE_TRAITS.map((trait) => {
                      const isSelected = localTraits.includes(trait.id);
                      return (
                        <Pressable
                          key={trait.id}
                          onPress={() => toggleTrait(trait.id)}
                          style={({ pressed }) => [
                            styles.traitChip,
                            isSelected && styles.traitChipSelected,
                            !isVip && styles.traitChipLocked,
                            pressed && { opacity: 0.75 },
                          ]}
                        >
                          <Feather name={trait.icon} size={13} color={isSelected ? "#fff" : Colors.text.secondary} />
                          <Text style={[styles.traitLabel, isSelected && styles.traitLabelSelected]}>{t(("char.trait." + trait.id) as any)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Feather name="mic" size={14} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>{t("char.voiceTone")}</Text>
                    {!isVip && (
                      <Pressable onPress={() => setShowPremiumSheet(true)} style={styles.vipChip}>
                        <Feather name="star" size={10} color="#FFD700" />
                        <Text style={styles.vipChipText}>Premium</Text>
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.sectionSub}>{t("char.voiceToneDesc")}</Text>
                  <View style={styles.voiceToneGrid}>
                    {VOICE_TONE_IDS.map((tone) => {
                      const isSelected = settings.voiceTone === tone.id;
                      return (
                        <Pressable
                          key={tone.id}
                          onPress={() => handleVoiceToneSelect(tone.id)}
                          style={({ pressed }) => [
                            styles.voiceToneItem,
                            isSelected && styles.voiceToneItemSelected,
                            !isVip && styles.voiceToneItemLocked,
                            pressed && { opacity: 0.75 },
                          ]}
                        >
                          <View style={styles.voiceToneIconRow}>
                            <Feather name={tone.icon} size={16} color={isSelected ? "#fff" : Colors.text.secondary} />
                            {!isVip && <Feather name="lock" size={10} color={Colors.text.tertiary} />}
                          </View>
                          <Text style={[styles.voiceToneLabel, isSelected && styles.voiceToneLabelSelected]}>{t(("char.voice." + tone.id) as any)}</Text>
                          <Text style={[styles.voiceToneDesc, isSelected && styles.voiceToneDescSelected]}>{t(("char.voice." + tone.id + ".desc") as any)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Feather name="cpu" size={14} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>{t("char.memory")}</Text>
                    <Text style={styles.memoriesCount}>{settings.memories.length}/6</Text>
                  </View>
                  <Text style={styles.sectionSub}>{t("char.memoryDesc")}</Text>
                  {settings.memories.length === 0 ? (
                    <View style={styles.emptyMemory}>
                      <Feather name="inbox" size={20} color={Colors.text.tertiary} />
                      <Text style={styles.emptyMemoryText}>{t("char.noMemory")}</Text>
                    </View>
                  ) : (
                    <View style={styles.memoriesList}>
                      {settings.memories.map((memory, index) => (
                        <View key={index} style={styles.memoryItem}>
                          <Feather name="clock" size={12} color={Colors.accent} />
                          <Text style={styles.memoryText}>{memory}</Text>
                          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRemoveMemory(index); }} hitSlop={8}>
                            <Feather name="x" size={13} color={Colors.text.tertiary} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>

              {isVip && hasChanges && (
                <Pressable onPress={handleSave} style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.88 }]}>
                  <LinearGradient colors={[Colors.userBubble.from, Colors.userBubble.to]} style={styles.saveBtnGradient}>
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>{t("char.save")}</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {!isVip && (
                <Pressable onPress={handleVipPress} style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.88 }]}>
                  <LinearGradient colors={["#FFD700", "#FF9500"]} style={styles.saveBtnGradient}>
                    <Feather name="star" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>{t("char.upgradePremium")}</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      <Modal visible={showPremiumSheet} transparent animationType="none" onRequestClose={() => setShowPremiumSheet(false)} statusBarTranslucent>
        <Pressable style={styles.overlay} onPress={() => setShowPremiumSheet(false)}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {Platform.OS === "ios" ? (
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
            )}
          </View>
        </Pressable>

        <Animated.View style={[styles.premiumSheet, { transform: [{ translateY: premiumAnim }] }]} pointerEvents="box-none">
          <View style={styles.premiumSheetInner}>
            <View style={styles.handle} />
            <View style={styles.premiumContent}>
              <LinearGradient colors={["rgba(255,214,0,0.15)", "rgba(255,149,0,0.08)"]} style={styles.premiumIconBg}>
                <Feather name="star" size={32} color="#FFD700" />
              </LinearGradient>
              <Text style={styles.premiumTitle}>{t("char.premiumFeature")}</Text>
              <Text style={styles.premiumDesc}>{t("char.voiceTonePremiumDesc")}</Text>
              <Pressable
                onPress={() => { setShowPremiumSheet(false); onClose(); router.push({ pathname: "/(tabs)/market", params: { tab: "premium" } }); }}
                style={({ pressed }) => [styles.premiumBtn, pressed && { opacity: 0.88 }]}
              >
                <LinearGradient colors={["#FFD700", "#FF9500"]} style={styles.premiumBtnGradient}>
                  <Feather name="star" size={16} color="#fff" />
                  <Text style={styles.premiumBtnText}>{t("char.upgradePremium")}</Text>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => setShowPremiumSheet(false)} style={styles.premiumDismiss}>
                <Text style={styles.premiumDismissText}>{t("char.notNow")}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SCREEN_H * 0.85, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 20 },
  sheetInner: { paddingBottom: Platform.OS === "ios" ? 34 : 24 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.15)", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.06)" },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.text.primary, letterSpacing: -0.4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.06)", justifyContent: "center", alignItems: "center" },
  scroll: { maxHeight: SCREEN_H * 0.55 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 20 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.text.primary, letterSpacing: -0.2 },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text.tertiary, lineHeight: 17, marginTop: -4 },
  vipChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,153,0,0.1)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,153,0,0.3)" },
  vipChipText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#FF9500" },
  nameInput: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 8, borderWidth: 1.5, borderColor: "transparent" },
  lockedInput: { opacity: 0.6 },
  nameInputText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text.primary },
  traitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  traitChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1.5, borderColor: "transparent" },
  traitChipSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  traitChipLocked: { opacity: 0.6 },
  traitLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.text.secondary },
  traitLabelSelected: { color: "#fff" },
  voiceToneGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  voiceToneItem: { flex: 1, minWidth: "28%", backgroundColor: "rgba(0,0,0,0.04)", borderRadius: 14, padding: 12, gap: 6, borderWidth: 1.5, borderColor: "transparent" },
  voiceToneItemSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  voiceToneItemLocked: { opacity: 0.65 },
  voiceToneIconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  voiceToneLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.text.primary },
  voiceToneLabelSelected: { color: "#fff" },
  voiceToneDesc: { fontSize: 10, fontFamily: "Inter_400Regular", color: Colors.text.tertiary, lineHeight: 14 },
  voiceToneDescSelected: { color: "rgba(255,255,255,0.8)" },
  memoriesCount: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.text.tertiary },
  emptyMemory: { alignItems: "center", paddingVertical: 16, gap: 8 },
  emptyMemoryText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.text.tertiary },
  memoriesList: { gap: 6 },
  memoryItem: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  memoryText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.text.primary, lineHeight: 17 },
  saveBtn: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, overflow: "hidden" },
  upgradeBtn: { marginHorizontal: 20, marginTop: 12, borderRadius: 16, overflow: "hidden" },
  saveBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  premiumSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  premiumSheetInner: { paddingBottom: Platform.OS === "ios" ? 34 : 24 },
  premiumContent: { padding: 24, alignItems: "center", gap: 14 },
  premiumIconBg: { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  premiumTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.text.primary, letterSpacing: -0.5 },
  premiumDesc: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text.secondary, textAlign: "center", lineHeight: 21 },
  premiumBtn: { alignSelf: "stretch", borderRadius: 16, overflow: "hidden" },
  premiumBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  premiumBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  premiumDismiss: { paddingVertical: 8 },
  premiumDismissText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.text.tertiary },
});
