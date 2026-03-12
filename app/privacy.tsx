import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Son güncelleme: —</Text>

        {/* 
          ═══════════════════════════════════════════════════
          GİZLİLİK POLİTİKASI METNİ BURAYA EKLENECEK
          Privacy policy text will be added here by the user.
          ═══════════════════════════════════════════════════
        */}

        <View style={styles.placeholder}>
          <Feather name="file-text" size={40} color="#CCC" />
          <Text style={styles.placeholderTitle}>Gizlilik Politikası</Text>
          <Text style={styles.placeholderText}>
            Gizlilik politikası metni yakında eklenecektir.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#111",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  lastUpdated: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#AAA",
    marginBottom: 24,
  },
  placeholder: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#888",
  },
  placeholderText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#AAA",
    textAlign: "center",
    lineHeight: 22,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#444",
    lineHeight: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#111",
    marginTop: 24,
    marginBottom: 8,
  },
});
