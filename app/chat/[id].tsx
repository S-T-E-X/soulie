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
  Modal,
  Alert,
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

import { CharacterCustomizeSheet } from "@/components/chat/CharacterCustomizeSheet";
import { GiftSheet } from "@/components/chat/GiftSheet";
import { RelationshipBar } from "@/components/chat/RelationshipBar";
import { useChatContext, generateId, type Message } from "@/contexts/ChatContext";
import { useCharacterSettings } from "@/hooks/useCharacterSettings";
import { useAutoMessages } from "@/hooks/useAutoMessages";
import { useStreak } from "@/hooks/useStreak";
import { useDailyQuota } from "@/hooks/useDailyQuota";
import { getCharacter, type Character } from "@/constants/characters";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

const IS_VIP = false;

function CharacterAvatar({ character, size = 38 }: { character: Character; size?: number }) {
  if (!character.image) {
    return (
      <LinearGradient
        colors={character.gradientColors}
        style={{ width: size, height: size, borderRadius: size / 2, justifyContent: "center", alignItems: "center" }}
      >
        <Feather name="eye" size={size * 0.45} color="rgba(255,255,255,0.9)" />
      </LinearGradient>
    );
  }
  return <Image source={character.image} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#E5E5EA" }} />;
}

function WelcomeMessage({ character, customName }: { character: Character; customName?: string }) {
  const displayName = customName || character.name;
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.welcomeContainer}>
      <View style={styles.welcomeAvatarWrapper}>
        {character.image ? (
          <Image source={character.image} style={styles.welcomeAvatar} />
        ) : (
          <LinearGradient
            colors={character.gradientColors}
            style={[styles.welcomeAvatar, { justifyContent: "center", alignItems: "center" }]}
          >
            <Feather name="eye" size={36} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={[...character.gradientColors]}
          style={styles.welcomeAvatarBorder}
        />
      </View>
      <Text style={styles.welcomeName}>{displayName}</Text>
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

function QuotaPopup({
  visible,
  onClose,
  onGoMarket,
  resetCountdown,
  language,
}: {
  visible: boolean;
  onClose: () => void;
  onGoMarket: () => void;
  resetCountdown: string;
  language: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.quotaBackdrop} onPress={onClose}>
        <Pressable style={styles.quotaCard}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8F8FF" }]} />
          )}
          <View style={styles.quotaIconWrap}>
            <LinearGradient colors={["#FF9500", "#FF6B00"]} style={styles.quotaIconGrad}>
              <Feather name="zap-off" size={26} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.quotaTitle}>
            {language === "en" ? "Daily limit reached" : "Günlük limit doldu"}
          </Text>
          <Text style={styles.quotaDesc}>
            {language === "en"
              ? `Free users can send 15 messages per day. Resets in ${resetCountdown}.`
              : `Ücretsiz kullanıcılar günde 15 mesaj gönderebilir. ${resetCountdown} içinde sıfırlanır.`}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onGoMarket();
            }}
            style={styles.quotaUpgradeBtn}
          >
            <LinearGradient colors={[Colors.userBubble.from, Colors.userBubble.to]} style={styles.quotaUpgradeBtnGrad}>
              <Feather name="star" size={15} color="#fff" />
              <Text style={styles.quotaUpgradeText}>
                {language === "en" ? "Upgrade to VIP" : "VIP'e Yükselt"}
              </Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onClose} style={styles.quotaCloseBtn} hitSlop={8}>
            <Text style={styles.quotaCloseText}>
              {language === "en" ? "Later" : "Daha Sonra"}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ characterId: string; id?: string }>();
  const characterId = params.characterId || params.id;
  const insets = useSafeAreaInsets();
  const { getConversationByCharacter, createConversationWithMessages, loadConversations, isLoaded } = useChatContext();
  const { settings, isLoaded: settingsLoaded, updateSettings, addMemory, removeMemory } = useCharacterSettings(characterId ?? "");
  const { user } = useAuth();
  const streak = useStreak(characterId ?? "");
  const quota = useDailyQuota();

  const character = characterId ? getCharacter(characterId) : undefined;

  const initializedRef = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string } | null>(null);
  const [showQuotaPopup, setShowQuotaPopup] = useState(false);
  const [showVideoVIPModal, setShowVideoVIPModal] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(quota.getResetCountdown());

  useEffect(() => {
    if (!quota.loaded || quota.canSend) return;
    const interval = setInterval(() => {
      setResetCountdown(quota.getResetCountdown());
    }, 60000);
    setResetCountdown(quota.getResetCountdown());
    return () => clearInterval(interval);
  }, [quota.loaded, quota.canSend, quota.getResetCountdown]);

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    const updated = messages.filter((m) => m.id !== msgId);
    setMessages(updated);
    if (character) {
      await createConversationWithMessages(character.id, settings.customName || character.name, updated);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [messages, character, settings.customName, createConversationWithMessages]);

  const userMessageCount = messages.filter(m => m.role === "user").length;

  useAutoMessages(character, settings, settingsLoaded, userMessageCount);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (!isLoaded || !characterId || initializedRef.current) return;
    const conversation = getConversationByCharacter(characterId);
    if (conversation?.messages && conversation.messages.length > 0) {
      setMessages(conversation.messages);
      initializedRef.current = true;
    } else if (isLoaded) {
      initializedRef.current = true;
    }
  }, [isLoaded, characterId, getConversationByCharacter]);

  const extractMemoryIfNeeded = useCallback(async (msgs: Message[]) => {
    const userMsgCount = msgs.filter(m => m.role === "user").length;
    if (userMsgCount > 0 && userMsgCount % 5 === 0 && settings.memories.length < 6) {
      try {
        const baseUrl = getApiUrl();
        const res = await fetch(`${baseUrl}api/extract-memory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: msgs.slice(-10).map(m => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        if (data.memory && data.memory.trim().length > 3) {
          await addMemory(data.memory.trim());
        }
      } catch {}
    }
  }, [settings.memories.length, addMemory]);

  const handleSend = useCallback(
    async (text: string, imageUri?: string) => {
      if (isStreaming || !character || !settingsLoaded) return;

      if (!IS_VIP && !quota.canSend) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setShowQuotaPopup(true);
        return;
      }

      const currentMessages = [...messages];

      let finalText = text;
      if (replyTo && text) {
        finalText = `(yanıt: "${replyTo.content.slice(0, 40)}") ${text}`;
      }
      setReplyTo(null);

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: finalText || "",
        imageUri,
        timestamp: Date.now(),
      };

      const newMessages = [...currentMessages, userMessage];
      setMessages(newMessages);
      setIsStreaming(true);
      setShowTyping(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await quota.markMessageSent();
      streak.update(character.name, user?.language ?? "tr");

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

        const userMsgCount = newMessages.filter(m => m.role === "user").length;
        const charXp = userMsgCount * 10;
        const charLevel = charXp < 50 ? 1 : charXp < 150 ? 5 : charXp < 300 ? 15 : charXp < 500 ? 25 : charXp < 750 ? 35 : charXp < 1050 ? 45 : 55;

        const response = await fetch(`${baseUrl}api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({
            messages: chatHistory,
            characterId: character.id,
            userLevel: charLevel,
            customName: settings.customName,
            selectedTraits: settings.traits,
            memories: settings.memories,
            userLanguage: user?.language ?? "tr",
          }),
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
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
                    { id: assistantId, role: "assistant", content: fullContent, timestamp: Date.now() },
                  ]);
                  assistantAdded = true;
                } else {
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                    return updated;
                  });
                }
              }
            } catch {}
          }
        }

        const finalMessages: Message[] = [
          ...newMessages,
          { id: assistantId, role: "assistant", content: fullContent, timestamp: Date.now() },
        ];

        await createConversationWithMessages(character.id, settings.customName || character.name, finalMessages);
        extractMemoryIfNeeded(finalMessages);
      } catch {
        setShowTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: generateId(), role: "assistant", content: "Bir hata oluştu, tekrar dener misin?", timestamp: Date.now() },
        ]);
      } finally {
        setIsStreaming(false);
        setShowTyping(false);
      }
    },
    [isStreaming, messages, character, settingsLoaded, settings, replyTo, createConversationWithMessages, extractMemoryIfNeeded, quota, streak, user]
  );

  const handleSendGift = useCallback(async (giftId: string) => {
    if (!character) return;
    const giftMessage: Message = {
      id: generateId(),
      role: "user",
      content: "",
      giftId,
      timestamp: Date.now(),
    };
    const newMessages = [...messages, giftMessage];
    setMessages(newMessages);
    await createConversationWithMessages(character.id, settings.customName || character.name, newMessages);
  }, [messages, character, settings.customName, createConversationWithMessages]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const reversedMessages = [...messages].reverse() as BubbleMessage[];
  const displayName = settings.customName || character?.name || "";

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
          <Pressable onPress={() => router.back()} style={styles.headerSideBtn} hitSlop={8}>
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
              <CharacterAvatar character={character} size={38} />
              <View style={styles.headerOnlineDot} />
            </View>
            <View>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName}>{displayName}</Text>
                {streak.streak >= 2 ? (
                  <View style={styles.headerStreakBadge}>
                    <Feather name="zap" size={9} color="#FF9500" />
                    <Text style={styles.headerStreakText}>{streak.streak}</Text>
                  </View>
                ) : null}
                <Feather name="chevron-right" size={13} color={Colors.text.tertiary} />
              </View>
              <Text style={styles.headerStatus}>
                {isStreaming ? "yazıyor..." : character.shortRole}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!IS_VIP) {
                setShowVideoVIPModal(true);
              } else {
                router.push({ pathname: "/video-chat/[characterId]", params: { characterId: character.id } });
              }
            }}
            style={styles.headerSideBtn}
            hitSlop={8}
          >
            <Feather name="video" size={18} color={IS_VIP ? Colors.text.secondary : "#FFD700"} />
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCustomize(true);
            }}
            style={styles.headerSideBtn}
            hitSlop={8}
          >
            <Feather name="sliders" size={19} color={Colors.text.secondary} />
          </Pressable>
        </View>
        <RelationshipBar xp={userMessageCount * 10} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              avatarImage={character.image}
              onReply={(msg) => {
                setReplyTo({ id: msg.id, content: msg.content });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onDelete={(msg) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                Alert.alert(
                  "Mesajı Sil",
                  "Bu mesajı silmek istediğine emin misin?",
                  [
                    { text: "İptal", style: "cancel" },
                    { text: "Sil", style: "destructive", onPress: () => handleDeleteMessage(msg.id) },
                  ]
                );
              }}
            />
          )}
          inverted={messages.length > 0}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          ListFooterComponent={
            messages.length === 0
              ? <WelcomeMessage character={character} customName={settings.customName} />
              : null
          }
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputArea}>
          {!IS_VIP && quota.loaded ? (
            <View style={styles.quotaBar}>
              <Feather
                name={quota.remaining === 0 ? "zap-off" : "zap"}
                size={11}
                color={quota.remaining === 0 ? "#FF3B30" : quota.remaining <= 3 ? "#FF9500" : Colors.text.tertiary}
              />
              <Text style={[styles.quotaBarText, quota.remaining === 0 && { color: "#FF3B30" }, quota.remaining <= 3 && quota.remaining > 0 && { color: "#FF9500" }]}>
                {quota.remaining > 0
                  ? `${quota.remaining}/${quota.DAILY_LIMIT} mesaj`
                  : `Limit doldu · ${resetCountdown}`}
              </Text>
              {quota.remaining === 0 ? (
                <Pressable onPress={() => setShowQuotaPopup(true)} hitSlop={4}>
                  <Text style={styles.quotaBarVipLink}>VIP'e geç</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <View style={styles.giftButtonRow}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowGifts(true);
              }}
              style={({ pressed }) => [styles.giftFloatBtn, pressed && { opacity: 0.8 }]}
            >
              <Feather name="gift" size={15} color="#fff" />
            </Pressable>
          </View>
          <View style={[styles.inputWrapper, { paddingBottom: bottomPad + 4 }]}>
            <ChatInput
              onSend={handleSend}
              disabled={isStreaming}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <CharacterCustomizeSheet
        visible={showCustomize}
        onClose={() => setShowCustomize(false)}
        characterName={character.name}
        settings={settings}
        isVip={settings.isPremium}
        onSave={(partial) => updateSettings(partial)}
        onRemoveMemory={removeMemory}
      />

      <GiftSheet
        visible={showGifts}
        onClose={() => setShowGifts(false)}
        onSendGift={handleSendGift}
      />

      <QuotaPopup
        visible={showQuotaPopup}
        onClose={() => setShowQuotaPopup(false)}
        onGoMarket={() => {
          setShowQuotaPopup(false);
          router.push("/(tabs)/market");
        }}
        resetCountdown={resetCountdown}
        language={user?.language ?? "tr"}
      />

      <Modal visible={showVideoVIPModal} transparent animationType="fade" onRequestClose={() => setShowVideoVIPModal(false)}>
        <Pressable style={styles.quotaBackdrop} onPress={() => setShowVideoVIPModal(false)}>
          <Pressable style={styles.quotaCard}>
            {Platform.OS === "ios" ? (
              <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8F8FF" }]} />
            )}
            <View style={styles.quotaIconWrap}>
              <LinearGradient colors={["#FFD700", "#FFB800"]} style={styles.quotaIconGrad}>
                <Feather name="video" size={26} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.quotaTitle}>Video Sohbet VIP'e Özel</Text>
            <Text style={styles.quotaDesc}>
              {character?.name} ile görüntülü sohbet başlatmak için VIP üyeliğe geçmelisin.
            </Text>
            <Pressable
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowVideoVIPModal(false);
                router.push("/(tabs)/market");
              }}
              style={styles.quotaUpgradeBtn}
            >
              <LinearGradient colors={["#FFD700", "#FFB800"]} style={styles.quotaUpgradeBtnGrad}>
                <Feather name="star" size={15} color="#fff" />
                <Text style={styles.quotaUpgradeText}>VIP'e Yükselt</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => setShowVideoVIPModal(false)} style={styles.quotaCloseBtn} hitSlop={8}>
              <Text style={styles.quotaCloseText}>Daha Sonra</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerSideBtn: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 19,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  headerAvatarWrapper: {
    position: "relative",
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
    gap: 5,
  },
  headerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  headerStreakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(255,149,0,0.12)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 7,
  },
  headerStreakText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FF9500",
  },
  headerStatus: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    letterSpacing: -0.1,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },
  inputArea: {
    backgroundColor: "transparent",
  },
  quotaBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
  },
  quotaBarText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
  quotaBarVipLink: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
  giftButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 0,
    backgroundColor: "transparent",
  },
  giftFloatBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  inputWrapper: {
    backgroundColor: "transparent",
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
    gap: 8,
    justifyContent: "center",
    marginTop: 4,
  },
  tag: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.text.secondary,
  },
  quotaBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  quotaCard: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  quotaIconWrap: {
    marginBottom: 4,
  },
  quotaIconGrad: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  quotaTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  quotaDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 21,
  },
  quotaUpgradeBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    width: "100%",
  },
  quotaUpgradeBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 8,
  },
  quotaUpgradeText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  quotaCloseBtn: {
    paddingVertical: 10,
  },
  quotaCloseText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
});
