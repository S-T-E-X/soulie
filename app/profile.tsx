import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Image,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";
import type { UserLanguage } from "@/contexts/AuthContext";
import { useI18n } from "@/hooks/useI18n";

const ACCENT = "#6C5CE7";

const LANG_OPTIONS: { key: UserLanguage; label: string; flag: string }[] = [
  { key: "en", label: "English", flag: "🇬🇧" },
  { key: "tr", label: "Türkçe", flag: "🇹🇷" },
  { key: "de", label: "Deutsch", flag: "🇩🇪" },
  { key: "zh", label: "中文", flag: "🇨🇳" },
  { key: "ko", label: "한국어", flag: "🇰🇷" },
  { key: "es", label: "Español", flag: "🇪🇸" },
  { key: "ru", label: "Русский", flag: "🇷🇺" },
];

const DEFAULT_HOBBIES = [
  "Müzik", "Spor", "Okumak", "Seyahat", "Yemek Pişirme",
  "Film", "Doğa", "Teknoloji", "Sanat", "Dans",
];

const DEFAULT_AVATAR = require("@/assets/default_pp/default-avatar-profile.png");

function Avatar({ uri, name, onPress }: { uri?: string | null; name: string; onPress: () => void }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const avatarSource = uri ? { uri } : DEFAULT_AVATAR;
  
  return (
    <Pressable style={styles.avatarContainer} onPress={onPress}>
      <Image source={avatarSource} style={styles.avatarImage} />
      <View style={styles.avatarEditBadge}>
        <Feather name="camera" size={14} color="#fff" />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile, logout } = useAuth();
  const { isDark, colors } = useTheme();
  const { t } = useI18n();

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? "");
  const [editBio, setEditBio] = useState(user?.bio ?? "");
  const [editHobbies, setEditHobbies] = useState<string[]>(user?.hobbies ?? []);
  const [editLanguage, setEditLanguage] = useState<UserLanguage>(user?.language ?? "tr");
  const [customHobby, setCustomHobby] = useState("");
  const [showHobbyPicker, setShowHobbyPicker] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("profile.permissionRequired"), t("profile.photoPermissionMessage"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await updateProfile({ profilePhoto: result.assets[0].uri });
    }
  }, [updateProfile]);

  const saveProfile = useCallback(async () => {
    await updateProfile({ name: editName.trim() || user?.name, bio: editBio, hobbies: editHobbies, language: editLanguage });
    setEditMode(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [editName, editBio, editHobbies, editLanguage, updateProfile]);

  const toggleHobby = (hobby: string) => {
    setEditHobbies((prev) => prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]);
  };

  const addCustomHobby = () => {
    const h = customHobby.trim();
    if (h && !editHobbies.includes(h)) setEditHobbies((prev) => [...prev, h]);
    setCustomHobby("");
    setShowHobbyPicker(false);
  };

  const handleLogout = () => {
    Alert.alert(t("settings.logoutConfirm"), t("settings.logoutMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("settings.logout"), style: "destructive", onPress: async () => { await logout(); router.replace("/"); } },
    ]);
  };

  const displayHobbies = editMode ? editHobbies : user?.hobbies ?? [];

  const cardBg = isDark ? "rgba(28,28,48,0.92)" : "#fff";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#F0F0F0";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.borderSubtle }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name="chevron-left" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.text.primary }]}>{t("profile.title")}</Text>
        {!editMode ? (
          <Pressable style={styles.editBtn} onPress={() => {
            setEditName(user?.name ?? "");
            setEditBio(user?.bio ?? "");
            setEditHobbies(user?.hobbies ?? []);
            setEditLanguage(user?.language ?? "en");
            setEditMode(true);
          }}>
            <Feather name="edit-2" size={18} color={ACCENT} />
          </Pressable>
        ) : (
          <Pressable style={styles.editBtn} onPress={saveProfile}>
            <Text style={styles.saveText}>{t("common.save")}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <Avatar uri={user?.profilePhoto} name={user?.name ?? "U"} onPress={pickImage} />
          {editMode ? (
            <TextInput
              style={[styles.nameInput, { color: colors.text.primary, borderBottomColor: ACCENT }]}
              value={editName}
              onChangeText={setEditName}
              placeholder={t("profile.namePlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              maxLength={30}
              textAlign="center"
            />
          ) : (
            <Text style={[styles.userName, { color: colors.text.primary }]}>{user?.name ?? t("settings.user")}</Text>
          )}
          {user?.email && <Text style={[styles.userEmail, { color: colors.text.secondary }]}>{user.email}</Text>}
          {user?.userId && <Text style={[styles.userEmail, { color: colors.text.tertiary, fontSize: 13 }]}>ID: {user.userId}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t("profile.about")}</Text>
          {editMode ? (
            <TextInput
              style={[styles.bioInput, { backgroundColor: cardBg, color: colors.text.primary, borderColor: `${ACCENT}40` }]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder={t("profile.bioPlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          ) : (
            <Text style={[styles.bioText, { backgroundColor: cardBg, color: colors.text.secondary }]}>{user?.bio ? user.bio : t("profile.noContent")}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t("profile.hobbies")}</Text>
          <View style={styles.hobbiesWrap}>
            {displayHobbies.map((h) => (
              <Pressable key={h} style={[styles.hobbyChip, editMode && styles.hobbyChipEdit]} onPress={() => editMode && toggleHobby(h)}>
                <Text style={styles.hobbyChipText}>{h}</Text>
                {editMode && <Feather name="x" size={12} color={ACCENT} style={{ marginLeft: 4 }} />}
              </Pressable>
            ))}
            {editMode && (
              <Pressable style={styles.addHobbyChip} onPress={() => setShowHobbyPicker(true)}>
                <Feather name="plus" size={14} color={ACCENT} />
                <Text style={styles.addHobbyText}>{t("common.add")}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{t("profile.info")}</Text>
          <View style={[styles.infoCard, { backgroundColor: cardBg }]}>
            {user?.birthdate && (
              <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.text.tertiary} />
                <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>{t("profile.birthdate")}</Text>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>{user.birthdate}</Text>
              </View>
            )}
            {user?.gender && (
              <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
                <Ionicons name="person-outline" size={18} color={colors.text.tertiary} />
                <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>{t("profile.gender")}</Text>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>{t(`profile.gender_${user.gender}` as any) ?? user.gender}</Text>
              </View>
            )}
            {editMode ? (
              <View style={[styles.infoRow, { borderBottomColor: borderColor, flexDirection: "column", alignItems: "flex-start", gap: 10, paddingVertical: 16 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="globe-outline" size={18} color={colors.text.tertiary} />
                  <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>{t("profile.appLanguage")}</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingLeft: 28 }}>
                  {LANG_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt.key}
                      onPress={() => { setEditLanguage(opt.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: editLanguage === opt.key ? ACCENT : isDark ? "rgba(255,255,255,0.15)" : "#E5E5EA",
                        backgroundColor: editLanguage === opt.key ? `${ACCENT}15` : "transparent",
                      }}
                    >
                      <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: editLanguage === opt.key ? ACCENT : colors.text.secondary }}>
                        {opt.flag} {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
                <Ionicons name="globe-outline" size={18} color={colors.text.tertiary} />
                <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>{t("profile.language")}</Text>
                <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                  {LANG_OPTIONS.find(o => o.key === (user?.language ?? "en"))?.label ?? "English"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={[styles.menuCard, { backgroundColor: cardBg }]}>
            <Pressable style={styles.menuRow} onPress={() => router.push("/privacy")}>
              <Feather name="shield" size={18} color={colors.text.tertiary} />
              <Text style={[styles.menuLabel, { color: colors.text.primary }]}>{t("settings.privacyPolicy")}</Text>
              <Feather name="chevron-right" size={16} color={colors.text.tertiary} />
            </Pressable>
            <View style={[styles.menuDivider, { backgroundColor: borderColor }]} />
            <Pressable style={styles.menuRow} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#FF3B30" />
              <Text style={[styles.menuLabel, { color: "#FF3B30" }]}>{t("settings.logout")}</Text>
              <Feather name="chevron-right" size={16} color={colors.text.tertiary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showHobbyPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowHobbyPicker(false)} />
        <View style={[styles.modalSheet, { backgroundColor: isDark ? "#1C1C30" : "#fff", paddingBottom: botPad + 16 }]}>
          <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t("profile.pickHobby")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {DEFAULT_HOBBIES.filter((h) => !editHobbies.includes(h)).map((h) => (
                <Pressable key={h} style={styles.suggestChip} onPress={() => { toggleHobby(h); setShowHobbyPicker(false); }}>
                  <Text style={styles.suggestChipText}>{h}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.customHobbyRow}>
            <TextInput
              style={[styles.customHobbyInput, { borderColor: isDark ? "rgba(255,255,255,0.15)" : "#E5E5E5", color: colors.text.primary, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#fff" }]}
              value={customHobby}
              onChangeText={setCustomHobby}
              placeholder={t("profile.customHobbyPlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              returnKeyType="done"
              onSubmitEditing={addCustomHobby}
            />
            <Pressable style={styles.customHobbyBtn} onPress={addCustomHobby}>
              <Feather name="plus" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F8FC" },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#F8F8FC",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: `${ACCENT}15`,
    minWidth: 36,
    alignItems: "center",
  },
  saveText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: ACCENT,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  profileHeader: { alignItems: "center", marginBottom: 28, gap: 10 },
  avatarContainer: { position: "relative", marginBottom: 4 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: "#333", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#F8F8FC" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#111" },
  nameInput: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#111", borderBottomWidth: 2, borderBottomColor: ACCENT, paddingBottom: 4, minWidth: 120, textAlign: "center" },
  userEmail: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#888" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  bioInput: { backgroundColor: "#fff", borderRadius: 14, padding: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: "#333", minHeight: 80, textAlignVertical: "top", borderWidth: 1.5, borderColor: `${ACCENT}40` },
  bioText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#555", lineHeight: 22, backgroundColor: "#fff", borderRadius: 14, padding: 14 },
  hobbiesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hobbyChip: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: `${ACCENT}18`, borderWidth: 1, borderColor: `${ACCENT}30` },
  hobbyChipEdit: { borderStyle: "dashed" },
  hobbyChipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: ACCENT },
  addHobbyChip: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: ACCENT, borderStyle: "dashed", gap: 4 },
  addHobbyText: { fontSize: 14, fontFamily: "Inter_500Medium", color: ACCENT },
  infoCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0F0F0" },
  infoLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#555" },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#333" },
  menuCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16, gap: 12 },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", color: "#333" },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "#F0F0F0", marginHorizontal: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#111", marginBottom: 16 },
  suggestChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: `${ACCENT}15`, borderWidth: 1, borderColor: `${ACCENT}30` },
  suggestChipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: ACCENT },
  customHobbyRow: { flexDirection: "row", gap: 10 },
  customHobbyInput: { flex: 1, borderWidth: 1.5, borderColor: "#E5E5E5", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: "#333" },
  customHobbyBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center" },
});
