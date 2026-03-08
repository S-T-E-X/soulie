import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInUp,
  FadeInDown,
} from "react-native-reanimated";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";

import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import { MessageBubble, type Message as BubbleMessage } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { ChatInput } from "@/components/chat/ChatInput";
import { useChatContext, generateId, type Message } from "@/contexts/ChatContext";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";

function WelcomeMessage() {
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.welcomeContainer}>
      <LinearGradient
        colors={["rgba(0,122,255,0.10)", "rgba(0,122,255,0.02)"]}
        style={styles.welcomeIcon}
      >
        <LinearGradient colors={["#4FC3F7", "#007AFF"]} style={styles.welcomeOrb} />
      </LinearGradient>
      <Text style={styles.welcomeTitle}>Merhaba, ben Lumina</Text>
      <Text style={styles.welcomeText}>
        Seni yargılamadan, sabırla dinlemek için buradayım. Ne hissediyorsun?
      </Text>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getConversation, updateConversation } = useChatContext();

  const conversation = getConversation(id);

  const initializedRef = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (conversation?.messages && !initializedRef.current) {
      setMessages(conversation.messages);
      initializedRef.current = true;
    }
  }, [conversation?.messages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (isStreaming) return;

      const currentMessages = [...messages];

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const newMessages = [...currentMessages, userMessage];
      setMessages(newMessages);
      setIsStreaming(true);
      setShowTyping(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const chatHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const baseUrl = getApiUrl();
        const response = await fetch(`${baseUrl}api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ messages: chatHistory }),
        });

        if (!response.ok) throw new Error("Request failed");

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";
        let assistantAdded = false;
        const assistantId = generateId();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;

                if (!assistantAdded) {
                  setShowTyping(false);
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantId,
                      role: "assistant",
                      content: fullContent,
                      timestamp: Date.now(),
                    },
                  ]);
                  assistantAdded = true;
                } else {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: fullContent,
                    };
                    return updated;
                  });
                }
              }
            } catch {}
          }
        }

        const finalMessages: Message[] = [
          ...newMessages,
          {
            id: assistantId,
            role: "assistant",
            content: fullContent,
            timestamp: Date.now(),
          },
        ];
        await updateConversation(id, finalMessages);
      } catch (error) {
        setShowTyping(false);
        const errMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: "Bir hata oluştu, tekrar dener misin?",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsStreaming(false);
        setShowTyping(false);
      }
    },
    [isStreaming, messages, id, updateConversation]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const reversedMessages = [...messages].reverse() as BubbleMessage[];

  return (
    <BackgroundGradient>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: topPad + 10 }]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={Colors.text.primary} />
          </Pressable>
          <View style={styles.headerCenter}>
            <LinearGradient
              colors={["#4FC3F7", "#007AFF"]}
              style={styles.headerAvatar}
            />
            <View>
              <Text style={styles.headerName}>Lumina</Text>
              <Text style={styles.headerStatus}>
                {isStreaming ? "yazıyor..." : "çevrimiçi"}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index === 0 ? 0 : 0).springify().damping(20)}>
              <MessageBubble message={item} />
            </Animated.View>
          )}
          inverted={messages.length > 0}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          ListFooterComponent={messages.length === 0 ? <WelcomeMessage /> : null}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.inputWrapper, { paddingBottom: bottomPad + 4 }]}>
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </View>
      </KeyboardAvoidingView>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  headerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  headerStatus: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.accent,
    letterSpacing: -0.1,
  },
  headerRight: {
    width: 36,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.04)",
  },
  welcomeContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 36,
    gap: 14,
  },
  welcomeIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  welcomeOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  welcomeTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.6,
  },
  welcomeText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 23,
    letterSpacing: -0.1,
  },
});
