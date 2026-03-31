import React, { useRef, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  Image,
  Text,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

interface ReplyPreview {
  content: string;
}

interface ChatInputProps {
  onSend: (text: string, imageUri?: string) => void;
  disabled?: boolean;
  replyTo?: ReplyPreview | null;
  onCancelReply?: () => void;
}

export function ChatInput({ onSend, disabled, replyTo, onCancelReply }: ChatInputProps) {
  const { t } = useI18n();
  const { isDark, colors } = useTheme();
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  const sendScale = useSharedValue(1);

  const hasContent = text.trim().length > 0 || pendingImage !== null;
  const canSend = hasContent && !disabled;

  const sendAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
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
    if (onCancelReply) onCancelReply();
    inputRef.current?.focus();
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      allowsEditing: false,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.base64) {
        const mimeType = asset.mimeType ?? "image/jpeg";
        setPendingImage(`data:${mimeType};base64,${asset.base64}`);
      } else {
        setPendingImage(asset.uri);
      }
    }
  };

  return (
    <View style={styles.wrapper}>
      {replyTo ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={[styles.replyPreview, { backgroundColor: isDark ? "rgba(10,132,255,0.12)" : "rgba(0,122,255,0.08)" }]}>
          <View style={[styles.replyBar, { backgroundColor: colors.accent }]} />
          <Text style={[styles.replyLabel, { color: colors.accent }]}>Yanıtla</Text>
          <Text style={[styles.replyContent, { color: colors.text.secondary }]} numberOfLines={1}>{replyTo.content}</Text>
          <Pressable onPress={onCancelReply} hitSlop={8}>
            <Feather name="x" size={15} color={colors.text.tertiary} />
          </Pressable>
        </Animated.View>
      ) : null}

      {pendingImage ? (
        <View style={styles.previewWrapper}>
          <Image source={{ uri: pendingImage }} style={styles.preview} resizeMode="cover" />
          <Pressable onPress={() => setPendingImage(null)} style={styles.previewRemove} hitSlop={8}>
            <Feather name="x" size={12} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.row}>
        {hasContent ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <Pressable
              onPress={handlePickImage}
              disabled={disabled}
              style={({ pressed }) => [styles.sidePhotoButton, {
                backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.75)",
                borderColor: isDark ? colors.border : "rgba(255,255,255,0.55)",
              }, pressed && { opacity: 0.7 }]}
              hitSlop={6}
            >
              <Feather name="image" size={19} color={disabled ? colors.text.tertiary : colors.text.secondary} />
            </Pressable>
          </Animated.View>
        ) : null}

        <View style={[styles.container, {
          borderColor: isDark ? colors.border : "rgba(255, 255, 255, 0.3)",
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255, 255, 255, 0.1)",
        }, hasContent && styles.containerActive]}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? colors.surface : "rgba(255, 255, 255, 0.08)" }]} pointerEvents="none" />
          )}

          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text.primary }]}
            value={text}
            onChangeText={setText}
            placeholder={t("chat.typeMessage")}
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={2000}
            blurOnSubmit={false}
            returnKeyType="default"
            keyboardAppearance={isDark ? "dark" : "light"}
          />

          {!hasContent ? (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
              <Pressable
                onPress={handlePickImage}
                disabled={disabled}
                style={({ pressed }) => [styles.inlinePhotoButton, pressed && { opacity: 0.7 }]}
                hitSlop={6}
              >
                <Feather name="image" size={20} color={disabled ? colors.text.tertiary : colors.text.secondary} />
              </Pressable>
            </Animated.View>
          ) : null}
        </View>

        {hasContent ? (
          <Animated.View style={sendAnimStyle} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={({ pressed }) => [styles.sendButton, { backgroundColor: colors.accent }, pressed && { opacity: 0.8 }]}
              hitSlop={8}
            >
              <Feather name="send" size={17} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: "transparent",
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,122,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  replyBar: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  replyLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
    letterSpacing: -0.1,
  },
  replyContent: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    letterSpacing: -0.1,
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
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  sidePhotoButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    marginBottom: 3,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    minHeight: 48,
  },
  containerActive: {
    paddingRight: 12,
  },
  fallback: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  inlinePhotoButton: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3,
  },
});
