import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
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

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);
  const sendScale = useSharedValue(1);
  const containerScale = useSharedValue(1);

  const canSend = text.trim().length > 0 && !disabled;

  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  const handleSend = () => {
    if (!canSend) return;
    const trimmed = text.trim();
    setText("");

    sendScale.value = withSpring(0.88, { damping: 12 }, () => {
      sendScale.value = withSpring(1, { damping: 10 });
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    containerScale.value = withTiming(1.01, { duration: 180 });
  };

  const handleBlur = () => {
    containerScale.value = withTiming(1, { duration: 180 });
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, containerAnimStyle]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]} pointerEvents="none" />
        )}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Bir şeyler söyle..."
          placeholderTextColor={Colors.text.tertiary}
          multiline
          maxLength={2000}
          blurOnSubmit={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="default"
          keyboardAppearance="light"
        />
        <Animated.View style={sendAnimStyle}>
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendButton,
              canSend && styles.sendButtonActive,
              pressed && { opacity: 0.8 },
            ]}
            hitSlop={8}
          >
            <Feather
              name="send"
              size={16}
              color={canSend ? "#FFFFFF" : Colors.text.tertiary}
            />
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.55)",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
  },
  fallback: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text.primary,
    lineHeight: 22,
    paddingVertical: 6,
    maxHeight: 120,
    letterSpacing: -0.1,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    marginBottom: 1,
  },
  sendButtonActive: {
    backgroundColor: Colors.accent,
  },
});
