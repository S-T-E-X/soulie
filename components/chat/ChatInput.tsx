import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";

interface ChatInputProps {
  onSend: (text: string, imageUri?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const sendScale = useSharedValue(1);
  const containerScale = useSharedValue(1);

  const canSend = (text.trim().length > 0 || pendingImage !== null) && !disabled;

  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
  }));

  const handleSend = () => {
    if (!canSend) return;
    const trimmed = text.trim();
    const img = pendingImage;
    setText("");
    setPendingImage(null);

    sendScale.value = withSpring(0.88, { damping: 12 }, () => {
      sendScale.value = withSpring(1, { damping: 10 });
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(trimmed, img ?? undefined);
    inputRef.current?.focus();
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPendingImage(result.assets[0].uri);
    }
  };

  const handleFocus = () => {
    containerScale.value = withTiming(1.01, { duration: 180 });
  };

  const handleBlur = () => {
    containerScale.value = withTiming(1, { duration: 180 });
  };

  return (
    <View style={styles.wrapper}>
      {pendingImage ? (
        <View style={styles.previewWrapper}>
          <Image source={{ uri: pendingImage }} style={styles.preview} resizeMode="cover" />
          <Pressable
            onPress={() => setPendingImage(null)}
            style={styles.previewRemove}
            hitSlop={8}
          >
            <Feather name="x" size={12} color="#fff" />
          </Pressable>
        </View>
      ) : null}
      <Animated.View style={[styles.container, containerAnimStyle]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallback]} pointerEvents="none" />
        )}

        <Pressable
          onPress={handlePickImage}
          disabled={disabled}
          style={({ pressed }) => [styles.photoButton, pressed && { opacity: 0.7 }]}
          hitSlop={6}
        >
          <Feather name="image" size={19} color={disabled ? Colors.text.tertiary : Colors.text.secondary} />
        </Pressable>

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
    gap: 8,
  },
  previewWrapper: {
    alignSelf: "flex-start",
    position: "relative",
    marginLeft: 4,
  },
  preview: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  previewRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.55)",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 52,
  },
  fallback: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
  },
  photoButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 2,
    marginBottom: 1,
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
    marginLeft: 4,
    marginBottom: 1,
  },
  sendButtonActive: {
    backgroundColor: Colors.accent,
  },
});
