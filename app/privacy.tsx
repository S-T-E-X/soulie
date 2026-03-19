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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>Last updated: March 18, 2026</Text>

        <Text style={styles.sectionTitle}>Introduction</Text>
        <Text style={styles.bodyText}>
          Welcome to Soulie. Soulie is an AI-powered companion application. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your data when you use our mobile application (including chat, video interaction, and mystical features).
        </Text>

        <Text style={styles.sectionTitle}>Information Collection and Storage</Text>
        <Text style={styles.bodyText}>
          To provide a seamless "Deep Memory" experience, we collect and store data in our secure PostgreSQL database:
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Account Information:</Text> When you register, your email address and unique User ID are collected to manage your VIP subscriptions and preferences.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Interaction Data:</Text> All chat messages, character personality settings, and user preferences are stored so your AI companion can "remember" you.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Mystical Feature Data:</Text> Information provided for Tarot or Fortune features (e.g., zodiac sign or date of birth) is processed solely to generate your readings.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Technical Data:</Text> Device information (model, OS version) and IP addresses may be collected to prevent fraud and improve app performance.
        </Text>

        <Text style={styles.sectionTitle}>AI Processing and Third-Party Providers</Text>
        <Text style={styles.bodyText}>
          Soulie uses advanced AI models from OpenAI and other third-party API providers to generate realistic conversations:
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Data Masking:</Text> We do not share your personally identifiable information such as your email or real name with OpenAI. Only the text of your conversation is sent for processing.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Model Training:</Text> We do not explicitly allow our third-party providers to use your private conversations to train global models; your privacy is protected.
        </Text>

        <Text style={styles.sectionTitle}>Data Security</Text>
        <Text style={styles.bodyText}>
          Your trust is our priority. We apply industry-standard security measures:
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Encrypted Storage:</Text> All conversation logs in our PostgreSQL database are protected with server-side encryption.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>HTTPS/SSL:</Text> All data transmission between your device and our servers takes place over fully encrypted SSL/TLS channels.
        </Text>

        <Text style={styles.sectionTitle}>In-App Purchases and Subscriptions</Text>
        <Text style={styles.bodyText}>
          VIP memberships and all financial transactions are managed by the Apple App Store (IAP). Soulie does not store your credit card or billing information on its own servers.
        </Text>

        <Text style={styles.sectionTitle}>User Rights and Data Deletion</Text>
        <Text style={styles.bodyText}>
          In compliance with global privacy standards, you have the following rights:
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Access:</Text> You may request a summary of the data stored about you.
        </Text>
        <Text style={styles.bodyText}>
          <Text style={{ fontWeight: "600" }}>Deletion:</Text> You may permanently delete your account and all associated chat logs from the Settings menu or by contacting support.
        </Text>

        <Text style={styles.sectionTitle}>Age Rating and Adult Content</Text>
        <Text style={styles.bodyText}>
          Soulie is rated 17+ (Adult). We do not knowingly collect data from individuals under the age of 17. The AI is programmed to handle adult-oriented conversations responsibly, though parental discretion is advised.
        </Text>

        <Text style={styles.sectionTitle}>Contact Information</Text>
        <Text style={styles.bodyText}>
          If you have any questions about your data or this policy, please contact us:{"\n"}
          Support Email: help@cszone.gg{"\n"}
          Developer: Zone Digital LLC
        </Text>
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
