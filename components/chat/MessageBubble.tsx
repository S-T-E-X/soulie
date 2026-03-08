import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Colors from "@/constants/colors";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={[styles.row, styles.rowUser]}>
        <LinearGradient
          colors={[Colors.userBubble.from, Colors.userBubble.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleUser]}
        >
          <Text style={styles.textUser}>{message.content}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowAI]}>
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={["#4FC3F7", "#007AFF"]}
          style={styles.avatar}
        />
      </View>
      <View style={[styles.bubble, styles.bubbleAI]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.aiBlurFallback]} />
        )}
        <Text style={styles.textAI}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 6,
    alignItems: "flex-end",
    maxWidth: "100%",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAI: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 20,
    overflow: "hidden",
  },
  bubbleUser: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomRightRadius: 6,
  },
  bubbleAI: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  aiBlurFallback: {
    backgroundColor: "rgba(255, 255, 255, 0.82)",
  },
  textUser: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    letterSpacing: -0.1,
  },
  textAI: {
    color: Colors.text.primary,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    letterSpacing: -0.1,
  },
});
