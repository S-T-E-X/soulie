import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  ImageSourcePropType,
  PanResponder,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { GIFTS } from "@/contexts/GiftContext";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  giftId?: string;
  timestamp: number;
};

interface Props {
  message: Message;
  avatarImage?: ImageSourcePropType;
  onReply?: (message: Message) => void;
}

const SWIPE_THRESHOLD = 58;

function GiftBubble({ giftId, isUser }: { giftId: string; isUser: boolean }) {
  const gift = GIFTS.find((g) => g.id === giftId);
  if (!gift) return null;

  return (
    <LinearGradient
      colors={[gift.colorFrom, gift.colorTo]}
      style={[styles.giftBubble, isUser ? styles.giftBubbleUser : styles.giftBubbleAI]}
    >
      <Feather name={gift.icon as any} size={28} color="#fff" />
      <Text style={styles.giftName}>{gift.name}</Text>
      <Text style={styles.giftSent}>{isUser ? "hediye gönderdin" : "sana hediye gönderdi"}</Text>
    </LinearGradient>
  );
}

function SwipeableAIBubble({ message, avatarImage, onReply }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const triggered = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && gs.dx > 6,
      onPanResponderGrant: () => {
        triggered.current = false;
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) return;
        const clamped = Math.min(gs.dx, SWIPE_THRESHOLD + 20);
        translateX.setValue(clamped);
        if (gs.dx >= SWIPE_THRESHOLD && !triggered.current) {
          triggered.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx >= SWIPE_THRESHOLD && onReply) {
          onReply(message);
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
        }).start();
      },
    })
  ).current;

  const replyIconOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const replyIconScale = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0.5, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.row, styles.rowAI]} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.replyHint,
          { opacity: replyIconOpacity, transform: [{ scale: replyIconScale }] },
        ]}
      >
        <Feather name="corner-up-right" size={16} color={Colors.accent} />
      </Animated.View>

      <Animated.View style={[styles.aiRowInner, { transform: [{ translateX }] }]}>
        <View style={styles.avatarContainer}>
          {avatarImage ? (
            <Image source={avatarImage} style={styles.avatarImage} />
          ) : (
            <LinearGradient colors={["#4FC3F7", "#007AFF"]} style={styles.avatarImage} />
          )}
        </View>

        {message.giftId ? (
          <GiftBubble giftId={message.giftId} isUser={false} />
        ) : (
          <View style={[styles.bubble, styles.bubbleAI]}>
            {Platform.OS === "ios" ? (
              <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.aiBlurFallback]} pointerEvents="none" />
            )}
            <Text style={styles.textAI}>{message.content}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

export function MessageBubble({ message, avatarImage, onReply }: Props) {
  const isUser = message.role === "user";

  if (!isUser) {
    return <SwipeableAIBubble message={message} avatarImage={avatarImage} onReply={onReply} />;
  }

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
        {message.giftId ? (
          <GiftBubble giftId={message.giftId} isUser={true} />
        ) : message.content ? (
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
    alignItems: "center",
  },
  aiRowInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    flex: 1,
  },
  replyHint: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,122,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
    marginBottom: 4,
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
  giftBubble: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    gap: 6,
    minWidth: 120,
  },
  giftBubbleUser: {
    borderBottomRightRadius: 6,
  },
  giftBubbleAI: {
    borderBottomLeftRadius: 6,
  },
  giftName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  giftSent: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: -0.1,
  },
});
