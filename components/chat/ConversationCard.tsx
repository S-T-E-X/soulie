import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { type Conversation } from "@/contexts/ChatContext";

interface Props {
  conversation: Conversation;
  onPress: () => void;
  onDelete: () => void;
}

export function ConversationCard({ conversation, onPress, onDelete }: Props) {
  const scale = useSharedValue(1);
  const deleteScale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.975, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12 });
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteScale.value = withSpring(0.85, { damping: 12 }, () => {
      deleteScale.value = withSpring(1);
    });
    onDelete();
  };

  const formatted = new Date(conversation.updatedAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });

  return (
    <Animated.View style={[styles.wrapper, cardStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.pressable}
      >
        <View style={styles.card}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.fallback]} />
          )}
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Feather name="message-circle" size={16} color={Colors.accent} />
            </View>
            <View style={styles.textContent}>
              <Text style={styles.title} numberOfLines={1}>
                {conversation.title}
              </Text>
              {conversation.lastMessage ? (
                <Text style={styles.preview} numberOfLines={1}>
                  {conversation.lastMessage}
                </Text>
              ) : null}
            </View>
            <View style={styles.right}>
              <Text style={styles.date}>{formatted}</Text>
              <Pressable
                onPress={handleDelete}
                hitSlop={12}
                style={styles.deleteButton}
              >
                <Feather name="trash-2" size={14} color={Colors.text.tertiary} />
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  pressable: {
    borderRadius: 18,
    overflow: "hidden",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.58)",
  },
  fallback: {
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  textContent: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  preview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    letterSpacing: -0.1,
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
  deleteButton: {
    padding: 2,
  },
});
