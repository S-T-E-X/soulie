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
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { type CharacterSettings, type VoiceTone } from "@/hooks/useCharacterSettings";
import Colors from "@/constants/colors";

const { height: SCREEN_H } = Dimensions.get("window");

export const AVAILABLE_TRAITS = [
  { id: "romantik", label: "Romantik", icon: "heart" as const },
  { id: "dinleyici", label: "Dinleyici", icon: "headphones" as const },
  { id: "koruyucu", label: "Koruyucu", icon: "shield" as const },
  { id: "disiplinli", label: "Sert/Disiplinli", icon: "zap" as const },
  { id: "entellektuel", label: "Entelektüel", icon: "book-open" as const },
  { id: "eglenceli", label: "Eğlenceli", icon: "smile" as const },
  { id: "gizemli", label: "Gizemli", icon: "moon" as const },
  { id: "sakaci", label: "Şakacı", icon: "message-circle" as const },
];

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const VOICE_TONES: { id: VoiceTone; label: string; icon: FeatherIconName; desc: string }[] = [
  { id: "warm", label: "Sıcak", icon: "sun", desc: "Sevecen ve rahatlatıcı" },
  { id: "playful", label: "Oyuncu", icon: "smile", desc: "Neşeli ve eğlenceli" },
  { id: "serious", label: "Ciddi", icon: "briefcase", desc: "Olgun ve düşünceli" },
  { id: "mysterious", label: "Gizemli", icon: "moon", desc: "Merak uyandıran" },
  { id: "energetic", label: "Enerjik", icon: "zap", desc: "Heyecanlı ve motive edici" },
];

const AUTO_MESSAGE_SLOTS: { key: "morning" | "noon" | "night"; label: string; time: string; icon: FeatherIconName }[] = [
  { key: "morning", label: "Sabah", time: "09:00", icon: "sunrise" },
  { key: "noon", label: "Öğle", time: "13:00", icon: "sun" },
  { key: "night", label: "Gece", time: "21:00", icon: "moon" },
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
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (showPremiumSheet) {
      Animated.spring(premiumAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 120,
      }).start();
    } else {
      Animated.timing(premiumAnim, {
        toValue: SCREEN_H,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showPremiumSheet]);

  const toggleTrait = (id: string) => {
    if (!isVip) {
      onClose();
      router.push({ pathname: "/(tabs)/market", params: { tab: "coins" } });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalTraits((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
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
    router.push({ pathname: "/(tabs)/market", params: { tab: "coins" } });
  };

  const handleAutoMessageToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave({ autoMessageEnabled: value });
  };

  const handleAutoMessageTimeToggle = (key: "morning" | "noon" | "night") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newTimes = { ...settings.autoMessageTimes, [key]: !settings.autoMessageTimes[key] };
    onSave({ autoMessageTimes: newTimes });
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
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS === "ios" ? (
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
            )}
          </View>
        </Pressable>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          pointerEvents="box-none"
        >
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
                    <Text style={styles.sectionTitle}>Özel İsim</Text>
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
                    <Text style={styles.sectionTitle}>Kişilik Özellikleri</Text>
                    {!isVip && (
                      <Pressable onPress={handleVipPress} style={styles.vipChip}>
                        <Feather name="star" size={10} color="#FFD700" />
                        <Text style={styles.vipChipText}>Premium</Text>
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.sectionSub}>
                    Seçtiğin özellikler {localName || characterName}'in sana yaklaşımını şekillendirir.
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
                          <Feather
                            name={trait.icon}
                            size={13}
                            color={isSelected ? "#fff" : Colors.text.secondary}
                          />
                          <Text style={[styles.traitLabel, isSelected && styles.traitLabelSelected]}>
                            {trait.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Feather name="mic" size={14} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>Ses Tonu</Text>
                    {!isVip && (
                      <Pressable onPress={() => setShowPremiumSheet(true)} style={styles.vipChip}>
                        <Feather name="star" size={10} color="#FFD700" />
                        <Text style={styles.vipChipText}>Premium</Text>
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.sectionSub}>
                    Karakterin konuşma tarzını belirle.
                  </Text>
                  <View style={styles.voiceToneGrid}>
                    {VOICE_TONES.map((tone) => {
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
                            <Feather
                              name={tone.icon}
                              size={16}
                              color={isSelected ? "#fff" : Colors.text.secondary}
                            />
                            {!isVip && (
                              <Feather name="lock" size={10} color={Colors.text.tertiary} />
                            )}
                          </View>
                          <Text style={[styles.voiceToneLabel, isSelected && styles.voiceToneLabelSelected]}>
                            {tone.label}
                          </Text>
                          <Text style={[styles.voiceToneDesc, isSelected && styles.voiceToneDescSelected]}>
                            {tone.desc}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Feather name="bell" size={14} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>Otomatik Mesajlar</Text>
                  </View>
                  <Text style={styles.sectionSub}>
                    Karakter belirli saatlerde sana mesaj göndersin.
                  </Text>
                  <View style={styles.autoMessageToggleRow}>
                    <Text style={styles.autoMessageToggleLabel}>Otomatik mesajları aç</Text>
                    <Switch
                      value={settings.autoMessageEnabled}
                      onValueChange={handleAutoMessageToggle}
                      trackColor={{ false: "#E5E5EA", true: Colors.accent }}
                      thumbColor="#fff"
                    />
                  </View>
                  {settings.autoMessageEnabled && (
                    <View style={styles.autoMessageTimesContainer}>
                      {AUTO_MESSAGE_SLOTS.map((slot) => (
                        <Pressable
                          key={slot.key}
                          onPress={() => handleAutoMessageTimeToggle(slot.key)}
                          style={({ pressed }) => [
                            styles.autoMessageTimeItem,
                            settings.autoMessageTimes[slot.key] && styles.autoMessageTimeItemActive,
                            pressed && { opacity: 0.75 },
                          ]}
                        >
                          <Feather
                            name={slot.icon}
                            size={16}
                            color={settings.autoMessageTimes[slot.key] ? Colors.accent : Colors.text.tertiary}
                          />
                          <View>
                            <Text style={[
                              styles.autoMessageTimeLabel,
                              settings.autoMessageTimes[slot.key] && styles.autoMessageTimeLabelActive,
                            ]}>
                              {slot.label}
                            </Text>
                            <Text style={styles.autoMessageTimeValue}>{slot.time}</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Feather name="cpu" size={14} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>Hafıza</Text>
                    <Text style={styles.memoriesCount}>{settings.memories.length}/6</Text>
                  </View>
                  <Text style={styles.sectionSub}>
                    Yapay zeka sohbetlerde önemli anları otomatik kaydeder.
                  </Text>
                  {settings.memories.length === 0 ? (
                    <View style={styles.emptyMemory}>
                      <Feather name="inbox" size={20} color={Colors.text.tertiary} />
                      <Text style={styles.emptyMemoryText}>Henüz kaydedilen an yok</Text>
                    </View>
                  ) : (
                    <View style={styles.memoriesList}>
                      {settings.memories.map((memory, index) => (
                        <View key={index} style={styles.memoryItem}>
                          <Feather name="clock" size={12} color={Colors.accent} />
                          <Text style={styles.memoryText}>{memory}</Text>
                          <Pressable
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              onRemoveMemory(index);
                            }}
                            hitSlop={8}
                          >
                            <Feather name="x" size={13} color={Colors.text.tertiary} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>

              {isVip && hasChanges && (
                <Pressable
                  onPress={handleSave}
                  style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.88 }]}
                >
                  <LinearGradient
                    colors={[Colors.userBubble.from, Colors.userBubble.to]}
                    style={styles.saveBtnGradient}
                  >
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Kaydet</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {!isVip && (
                <Pressable
                  onPress={handleVipPress}
                  style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.88 }]}
                >
                  <LinearGradient
                    colors={["#FFD700", "#FF9500"]}
                    style={styles.saveBtnGradient}
                  >
                    <Feather name="star" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Premium'a Geç</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      <Modal
        visible={showPremiumSheet}
        transparent
        animationType="none"
        onRequestClose={() => setShowPremiumSheet(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={() => setShowPremiumSheet(false)}>
          <View style={StyleSheet.absoluteFill}>
            {Platform.OS === "ios" ? (
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} />
            )}
          </View>
        </Pressable>

        <Animated.View
          style={[styles.premiumSheet, { transform: [{ translateY: premiumAnim }] }]}
          pointerEvents="box-none"
        >
          <View style={styles.premiumSheetInner}>
            <View style={styles.handle} />
            <View style={styles.premiumContent}>
              <LinearGradient
                colors={["rgba(255,214,0,0.15)", "rgba(255,149,0,0.08)"]}
                style={styles.premiumIconBg}
              >
                <Feather name="star" size={32} color="#FFD700" />
              </LinearGradient>
              <Text style={styles.premiumTitle}>Premium Özellik</Text>
              <Text style={styles.premiumDesc}>
                Ses tonu seçimi Premium üyelere özel bir özelliktir. Premium'a geçerek karakterinin konuşma tarzını özelleştirebilirsin.
              </Text>
              <Pressable
                onPress={() => {
                  setShowPremiumSheet(false);
                  onClose();
                  router.push({ pathname: "/(tabs)/market", params: { tab: "coins" } });
                }}
                style={({ pressed }) => [styles.premiumBtn, pressed && { opacity: 0.88 }]}
              >
                <LinearGradient
                  colors={["#FFD700", "#FF9500"]}
                  style={styles.premiumBtnGradient}
                >
                  <Feather name="star" size={16} color="#fff" />
                  <Text style={styles.premiumBtnText}>Premium'a Geç</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={() => setShowPremiumSheet(false)}
                style={styles.premiumDismiss}
              >
                <Text style={styles.premiumDismissText}>Şimdilik değil</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetInner: {
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    maxHeight: SCREEN_H * 0.55,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
    lineHeight: 17,
    marginTop: -4,
  },
  vipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,153,0,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,153,0,0.3)",
  },
  vipChipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#FF9500",
  },
  memoriesCount: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text.tertiary,
  },
  nameInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  lockedInput: {
    backgroundColor: "#F0F0F2",
    opacity: 0.8,
  },
  nameInputText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text.primary,
  },
  traitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  traitChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F7",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  traitChipSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  traitChipLocked: {
    opacity: 0.7,
  },
  traitLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text.secondary,
  },
  traitLabelSelected: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  voiceToneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  voiceToneItem: {
    width: "48%",
    backgroundColor: "#F5F5F7",
    borderRadius: 14,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  voiceToneItemSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  voiceToneItemLocked: {
    opacity: 0.6,
  },
  voiceToneIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voiceToneLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    marginTop: 2,
  },
  voiceToneLabelSelected: {
    color: "#fff",
  },
  voiceToneDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
  voiceToneDescSelected: {
    color: "rgba(255,255,255,0.8)",
  },
  autoMessageToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F5F7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  autoMessageToggleLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text.primary,
  },
  autoMessageTimesContainer: {
    flexDirection: "row",
    gap: 8,
  },
  autoMessageTimeItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F5F7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  autoMessageTimeItemActive: {
    backgroundColor: "rgba(0,122,255,0.08)",
    borderColor: "rgba(0,122,255,0.2)",
  },
  autoMessageTimeLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.secondary,
  },
  autoMessageTimeLabelActive: {
    color: Colors.accent,
  },
  autoMessageTimeValue: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
  emptyMemory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    justifyContent: "center",
    opacity: 0.5,
  },
  emptyMemoryText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
  memoriesList: {
    gap: 6,
  },
  memoryItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F5F5F7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  memoryText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  saveBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  upgradeBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  saveBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: -0.2,
  },
  premiumSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  premiumSheetInner: {
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  premiumContent: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 12,
  },
  premiumIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  premiumTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  premiumDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 21,
  },
  premiumBtn: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  premiumBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  premiumBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: -0.2,
  },
  premiumDismiss: {
    paddingVertical: 8,
  },
  premiumDismissText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text.tertiary,
  },
});
