import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
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
import { getCharacter, type Character } from "@/constants/characters";
import { getApiUrl } from "@/lib/query-client";
import Colors from "@/constants/colors";

function WelcomeMessage({ character }: { character: Character }) {
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.welcomeContainer}>
      <View style={styles.welcomeAvatarWrapper}>
        <Image source={character.image} style={styles.welcomeAvatar} />
        <LinearGradient
          colors={[...character.gradientColors]}
          style={styles.welcomeAvatarBorder}
        />
      </View>
      <Text style={styles.welcomeName}>{character.name}</Text>
      <View style={styles.welcomeRoleBadge}>
        <Text style={styles.welcomeRoleText}>{character.shortRole}</Text>
      </View>
      <Text style={styles.welcomeDesc}>{character.description}</Text>
      <View style={styles.tagsRow}>
        {character.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ characterId: string; id?: string }>();
  const characterId = params.characterId || params.id;
  const insets = useSafeAreaInsets();
  const { getConversation, createConversationWithMessages } = useChatContext();

  const character = characterId ? getCharacter(characterId) : undefined;
  const conversation = characterId ? getConversation(characterId) : undefined;

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
    async (text: string, imageUri?: string) => {
      if (isStreaming || !character) return;

      const currentMessages = [...messages];

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: text || (imageUri ? "" : ""),
        imageUri,
        timestamp: Date.now(),
      };

      const newMessages = [...currentMessages, userMessage];
      setMessages(newMessages);
      setIsStreaming(true);
      setShowTyping(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        const baseUrl = getApiUrl();

        const chatHistory = newMessages.map((m) => {
          if (m.imageUri) {
            return {
              role: m.role,
              content: [
                ...(m.content ? [{ type: "text", text: m.content }] : []),
                { type: "image_url", image_url: { url: m.imageUri } },
              ],
            };
          }
          return { role: m.role, content: m.content };
        });

        const response = await fetch(`${baseUrl}api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            messages: chatHistory,
            characterId: character.id,
          }),
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

        await createConversationWithMessages(character.id, character.name, finalMessages);
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
    [isStreaming, messages, character, createConversationWithMessages]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const reversedMessages = [...messages].reverse() as BubbleMessage[];

  if (!character) {
    return (
      <BackgroundGradient>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: Colors.text.secondary, fontFamily: "Inter_400Regular" }}>
            Karakter bulunamadı
          </Text>
        </View>
      </BackgroundGradient>
    );
  }

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

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/character/[characterId]", params: { characterId: character.id } });
            }}
            style={styles.headerCenter}
            hitSlop={4}
          >
            <View style={styles.headerAvatarWrapper}>
              <Image source={character.image} style={styles.headerAvatar} />
              <View style={styles.headerOnlineDot} />
            </View>
            <View>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName}>{character.name}</Text>
                <Feather name="chevron-right" size={13} color={Colors.text.tertiary} />
              </View>
              <Text style={styles.headerStatus}>
                {isStreaming ? "yazıyor..." : character.shortRole}
              </Text>
            </View>
          </Pressable>

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
          renderItem={({ item }) => (
            <MessageBubble message={item} avatarImage={character.image} />
          )}
          inverted={messages.length > 0}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          ListFooterComponent={messages.length === 0 ? <WelcomeMessage character={character} /> : null}
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
  flex: { flex: 1 },
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
  headerAvatarWrapper: {
    position: "relative",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E5E5EA",
  },
  headerOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
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
    color: Colors.text.secondary,
    letterSpacing: -0.1,
  },
  headerRight: { width: 36 },
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
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 10,
  },
  welcomeAvatarWrapper: {
    position: "relative",
    marginBottom: 4,
  },
  welcomeAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E5E5EA",
  },
  welcomeAvatarBorder: {
    position: "absolute",
    inset: -3,
    borderRadius: 51,
    zIndex: -1,
    opacity: 0.7,
  },
  welcomeName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  welcomeRoleBadge: {
    backgroundColor: "rgba(0,122,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  welcomeRoleText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  welcomeDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.text.secondary,
  },
});
