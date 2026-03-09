import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Colors from "@/constants/colors";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
};

interface Props {
  message: Message;
  avatarImage?: ImageSourcePropType;
}

export function MessageBubble({ message, avatarImage }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <View style={[styles.row, styles.rowUser]}>
        <View style={styles.bubbleUserWrapper}>
          {message.imageUri ? (
            <Image
              source={{ uri: message.imageUri }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          ) : null}
          {message.content ? (
            <LinearGradient
              colors={[Colors.userBubble.from, Colors.userBubble.to]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.bubbleUser]}
            >
              <Text style={styles.textUser}>{message.content}</Text>
            </LinearGradient>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowAI]}>
      <View style={styles.avatarContainer}>
        {avatarImage ? (
          <Image source={avatarImage} style={styles.avatarImage} />
        ) : (
          <LinearGradient
            colors={["#4FC3F7", "#007AFF"]}
            style={styles.avatarImage}
          />
        )}
      </View>
      <View style={[styles.bubble, styles.bubbleAI]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.aiBlurFallback]} pointerEvents="none" />
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
    marginVertical: 4,
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
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  bubbleUserWrapper: {
    gap: 4,
    alignItems: "flex-end",
    maxWidth: "75%",
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    borderBottomRightRadius: 4,
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
    maxWidth: "100%",
  },
  bubbleAI: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    maxWidth: "75%",
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
