import React, { useState, useRef, useEffect, useCallback } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
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
  ActivityIndicator,
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
import { RelationshipBar, getRelationshipLevel } from "@/components/chat/RelationshipBar";
import { useChatContext, generateId, type Message } from "@/contexts/ChatContext";
import { useCharacterSettings } from "@/hooks/useCharacterSettings";
import { useAutoMessages } from "@/hooks/useAutoMessages";
import { useStreak } from "@/hooks/useStreak";
import { useDailyQuota } from "@/hooks/useDailyQuota";
import { getCharacter, type Character } from "@/constants/characters";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { GIFTS } from "@/contexts/GiftContext";

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
  const { colors } = useTheme();
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
      <Text style={[styles.welcomeName, { color: colors.text.primary }]}>{displayName}</Text>
      <View style={styles.welcomeRoleBadge}>
        <Text style={styles.welcomeRoleText}>{character.shortRole}</Text>
      </View>
      <Text style={[styles.welcomeDesc, { color: colors.text.secondary }]}>{character.description}</Text>
      <View style={styles.tagsRow}>
        {character.tags.map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.tagText, { color: colors.text.secondary }]}>{tag}</Text>
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
  onWatchAd,
  resetCountdown,
  language,
}: {
  visible: boolean;
  onClose: () => void;
  onGoMarket: () => void;
  onWatchAd: () => void;
  resetCountdown: string;
  language: string;
}) {
  const { isDark, colors } = useTheme();
  const [isWatching, setIsWatching] = React.useState(false);
  const [adCountdown, setAdCountdown] = React.useState(5);

  const handleWatchAd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsWatching(true);
    setAdCountdown(5);
    let count = 5;
    const iv = setInterval(() => {
      count -= 1;
      setAdCountdown(count);
      if (count <= 0) {
        clearInterval(iv);
        setIsWatching(false);
        onWatchAd();
      }
    }, 1000);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.quotaBackdrop} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.quotaCard, { borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)" }]} pointerEvents="box-none">
          {Platform.OS === "ios" ? (
            <BlurView intensity={70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? colors.surfaceStrong : "#F8F8FF" }]} pointerEvents="none" />
          )}
          <View style={styles.quotaIconWrap} pointerEvents="none">
            <LinearGradient colors={["#FF9500", "#FF6B00"]} style={styles.quotaIconGrad}>
              <Feather name="zap-off" size={26} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[styles.quotaTitle, { color: colors.text.primary }]} pointerEvents="none">
            {language === "en" ? "Daily limit reached" : "Günlük limit doldu"}
          </Text>
          <Text style={[styles.quotaDesc, { color: colors.text.secondary }]} pointerEvents="none">
            {language === "en"
              ? `Free users can send 15 messages per day. Resets in ${resetCountdown}.`
              : `Ücretsiz kullanıcılar günde 15 mesaj gönderebilir. ${resetCountdown} içinde sıfırlanır.`}
          </Text>
          <Pressable
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onGoMarket(); }}
            style={styles.quotaUpgradeBtn}
          >
            <LinearGradient colors={[colors.userBubble.from, colors.userBubble.to]} style={styles.quotaUpgradeBtnGrad}>
              <Feather name="star" size={15} color="#fff" />
              <Text style={styles.quotaUpgradeText}>
                {language === "en" ? "Upgrade to VIP" : "VIP'e Yükselt"}
              </Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            onPress={handleWatchAd}
            disabled={isWatching}
            style={[styles.quotaWatchAdBtn, { borderColor: colors.accent + "40", backgroundColor: colors.accent + "08" }]}
          >
            {isWatching ? (
              <View style={styles.quotaWatchAdInner}>
                <Feather name="film" size={14} color={colors.accent} />
                <Text style={[styles.quotaWatchAdText, { color: colors.accent }]}>Reklam izleniyor... {adCountdown}s</Text>
              </View>
            ) : (
              <View style={styles.quotaWatchAdInner}>
                <Feather name="play-circle" size={14} color={colors.accent} />
                <Text style={[styles.quotaWatchAdText, { color: colors.accent }]}>
                  {language === "en" ? "Watch ad (+5 messages)" : "Video izle (+5 mesaj kazan)"}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={onClose} style={styles.quotaCloseBtn} hitSlop={8}>
            <Text style={[styles.quotaCloseText, { color: colors.text.tertiary }]}>
              {language === "en" ? "Later" : "Daha Sonra"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function FortuneSheet({
  visible,
  onClose,
  onSubmit,
  characterName,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (images: string[]) => void;
  characterName: string;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setImages([null, null, null]);
      setLoading(false);
    }
  }, [visible]);

  const pickImage = async (index: number) => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("İzin gerekli", "Fotoğraf seçmek için galeri izni vermelisin.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const updated = [...images];
      updated[index] = result.assets[0].uri;
      setImages(updated);
    }
  };

  const allSelected = images.every((img) => img !== null);

  const handleSubmit = async () => {
    if (!allSelected || loading) return;
    setLoading(true);
    const base64Images: string[] = [];
    for (const uri of images) {
      if (!uri) continue;
      try {
        if (Platform.OS === "web" && uri.startsWith("blob:")) {
          const resp = await globalThis.fetch(uri);
          const blob = await resp.blob();
          const reader = new FileReader();
          const dataUrl: string = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          base64Images.push(dataUrl);
        } else if (uri.startsWith("file://") || uri.startsWith("content://")) {
          const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
          const mimeType = uri.toLowerCase().includes(".png") ? "image/png" : "image/jpeg";
          base64Images.push(`data:${mimeType};base64,${base64}`);
        } else {
          base64Images.push(uri);
        }
      } catch {
        base64Images.push(uri);
      }
    }
    setLoading(false);
    onClose();
    onSubmit(base64Images);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fortuneStyles.overlay} onPress={onClose} />
      <View style={[fortuneStyles.sheet, { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7", paddingBottom: insets.bottom + 24 }]}>
        <View style={fortuneStyles.handle} />
        <View style={fortuneStyles.sheetHeader}>
          <Text style={[fortuneStyles.sheetTitle, { color: colors.text.primary }]}>☕ Kahve Falı</Text>
          <Text style={[fortuneStyles.sheetSubtitle, { color: colors.text.secondary }]}>
            Fincanının 3 farklı açıdan fotoğrafını yükle
          </Text>
        </View>

        <View style={fortuneStyles.imageGrid}>
          {images.map((img, i) => (
            <Pressable
              key={i}
              onPress={() => pickImage(i)}
              style={({ pressed }) => [
                fortuneStyles.imageSlot,
                { borderColor: img ? "#8B5CF6" : isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" },
                pressed && { opacity: 0.75 },
              ]}
            >
              {img ? (
                <Image source={{ uri: img }} style={fortuneStyles.imagePreview} />
              ) : (
                <View style={fortuneStyles.imageEmpty}>
                  <Feather name="camera" size={22} color={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)"} />
                  <Text style={[fortuneStyles.imageSlotLabel, { color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)" }]}>
                    {i === 0 ? "Fincan üstü" : i === 1 ? "Fincan içi" : "Fincan altı"}
                  </Text>
                </View>
              )}
              {img && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    const updated = [...images];
                    updated[i] = null;
                    setImages(updated);
                  }}
                  style={fortuneStyles.removeBtn}
                  hitSlop={8}
                >
                  <Feather name="x" size={12} color="#fff" />
                </Pressable>
              )}
            </Pressable>
          ))}
        </View>

        <Text style={[fortuneStyles.hint, { color: colors.text.tertiary }]}>
          {allSelected ? "Tüm fotoğraflar hazır — fala bakılmaya hazır!" : `${images.filter(Boolean).length}/3 fotoğraf yüklendi`}
        </Text>

        <Pressable
          onPress={handleSubmit}
          disabled={!allSelected || loading}
          style={({ pressed }) => [
            fortuneStyles.submitBtn,
            { backgroundColor: allSelected ? "#8B5CF6" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={[fortuneStyles.submitBtnText, { color: allSelected ? "#fff" : colors.text.tertiary }]}>
                {allSelected ? "Falıma Bak ✨" : "Fotoğrafları seç"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const fortuneStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(120,120,128,0.3)", alignSelf: "center", marginBottom: 16 },
  sheetHeader: { alignItems: "center", marginBottom: 24 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 6 },
  sheetSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  imageGrid: { flexDirection: "row", gap: 12, justifyContent: "space-between", marginBottom: 16 },
  imageSlot: { flex: 1, aspectRatio: 0.9, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", overflow: "hidden", position: "relative" },
  imagePreview: { width: "100%", height: "100%", borderRadius: 12 },
  imageEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  imageSlotLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 4 },
  removeBtn: { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 20 },
  submitBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

export default function ChatScreen() {
  const params = useLocalSearchParams<{ characterId: string; id?: string }>();
  const characterId = params.characterId || params.id;
  const insets = useSafeAreaInsets();
  const { getConversationByCharacter, createConversationWithMessages, loadConversations, isLoaded } = useChatContext();
  const { settings, isLoaded: settingsLoaded, updateSettings, addMemory, removeMemory } = useCharacterSettings(characterId ?? "");
  const { user } = useAuth();
  const { isDark, colors } = useTheme();
  const streak = useStreak(characterId ?? "");
  const quota = useDailyQuota(!!user?.isVip);

  const character = characterId ? getCharacter(characterId) : undefined;

  const initializedRef = useRef(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [showFortuneSheet, setShowFortuneSheet] = useState(false);
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
  const charXp = userMessageCount * 10 + (settings.giftBonusXP || 0);
  const relLevel = getRelationshipLevel(charXp);

  const userMessages = messages.filter(m => m.role === "user");
  const lastUserMsg = userMessages[userMessages.length - 1];
  const lastUserMessageTime = lastUserMsg?.timestamp ?? 0;
  const lastUserMessageText = lastUserMsg?.content ?? "";

  useAutoMessages(character, settings, settingsLoaded, userMessageCount, lastUserMessageTime, lastUserMessageText);

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

      if (!user?.isVip && !quota.canSend) {
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

        const convertedMessages = await Promise.all(
          newMessages.map(async (m) => {
            if (!m.imageUri || m.imageUri.startsWith("data:")) return m;
            if (m.imageUri.startsWith("file://") || m.imageUri.startsWith("content://")) {
              try {
                const base64 = await FileSystem.readAsStringAsync(m.imageUri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                if (!base64) return { ...m, imageUri: undefined };
                const mimeType = m.imageUri.toLowerCase().includes(".png") ? "image/png" : "image/jpeg";
                return { ...m, imageUri: `data:${mimeType};base64,${base64}` };
              } catch {
                return { ...m, imageUri: undefined };
              }
            }
            if (Platform.OS === "web" && m.imageUri.startsWith("blob:")) {
              try {
                const resp = await globalThis.fetch(m.imageUri);
                const blob = await resp.blob();
                const reader = new FileReader();
                const dataUrl: string = await new Promise((resolve, reject) => {
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                return { ...m, imageUri: dataUrl };
              } catch {
                return { ...m, imageUri: undefined };
              }
            }
            return m;
          })
        );

        const chatHistory = convertedMessages.map((m) => {
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
        const xp = userMsgCount * 10 + (settings.giftBonusXP || 0);
        const charLevel = xp < 50 ? 1 : xp < 150 ? 5 : xp < 300 ? 15 : xp < 500 ? 25 : xp < 750 ? 35 : xp < 1050 ? 45 : 55;
        const currentRelLevel = getRelationshipLevel(xp);

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
            voiceTone: settings.voiceTone,
            relationshipLevelName: currentRelLevel.name,
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
    const gift = GIFTS.find((g) => g.id === giftId);
    if (!gift) return;

    const giftXP = Math.floor(gift.price / 5);
    const newGiftBonusXP = (settings.giftBonusXP || 0) + giftXP;
    await updateSettings({ giftBonusXP: newGiftBonusXP });

    const giftMessage: Message = {
      id: generateId(),
      role: "user",
      content: "",
      giftId,
      timestamp: Date.now(),
    };
    const withGift = [...messages, giftMessage];
    setMessages(withGift);

    const baseUrl = getApiUrl();
    const xpForResp = (userMessageCount * 10) + newGiftBonusXP;
    const levelForResp = getRelationshipLevel(xpForResp);

    try {
      const response = await fetch(`${baseUrl}api/gift-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          characterId: character.id,
          giftName: gift.name,
          customName: settings.customName,
          selectedTraits: settings.traits,
          memories: settings.memories,
          userLanguage: user?.language ?? "tr",
          relationshipLevelName: levelForResp.name,
        }),
      });

      if (!response.body) {
        await createConversationWithMessages(character.id, settings.customName || character.name, withGift);
        return;
      }

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
        ...withGift,
        { id: assistantId, role: "assistant", content: fullContent, timestamp: Date.now() },
      ];
      await createConversationWithMessages(character.id, settings.customName || character.name, finalMessages);
    } catch {
      await createConversationWithMessages(character.id, settings.customName || character.name, withGift);
    }
  }, [messages, character, settings, userMessageCount, createConversationWithMessages, updateSettings, user]);

  const handleFortuneTell = useCallback(async (fortuneImages: string[]) => {
    if (!character) return;
    setIsStreaming(true);
    setShowTyping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: "☕ Kahve fincanımın falına bak lütfen.",
      timestamp: Date.now(),
    };
    const withUser = [...messages, userMsg];
    setMessages(withUser);

    const baseUrl = getApiUrl();
    try {
      const response = await fetch(`${baseUrl}api/fortune`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          images: fortuneImages,
          customName: settings.customName,
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
                setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: fullContent, timestamp: Date.now() }]);
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
        ...withUser,
        { id: assistantId, role: "assistant", content: fullContent, timestamp: Date.now() },
      ];
      await createConversationWithMessages(character.id, settings.customName || character.name, finalMessages);
    } catch {
      setShowTyping(false);
      setMessages((prev) => [...prev, { id: generateId(), role: "assistant", content: "Falınıza bakarken bir hata oluştu. Tekrar deneyebilirsiniz.", timestamp: Date.now() }]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [character, messages, settings, user, createConversationWithMessages]);

  const isSibel = character?.id === "sibel";
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const reversedMessages = [...messages].reverse() as BubbleMessage[];
  const displayName = settings.customName || character?.name || "";

  if (!character) {
    return (
      <BackgroundGradient>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#6B6B6E", fontFamily: "Inter_400Regular" }}>
            Karakter bulunamadı
          </Text>
        </View>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <StatusBar barStyle={colors.statusBar} />

      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: isDark ? colors.borderSubtle : "rgba(0,0,0,0.05)" }]}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={50} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        ) : null}
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.back()} style={styles.headerSideBtn} hitSlop={8}>
            <Feather name="chevron-left" size={22} color={colors.text.primary} />
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
                <Text style={[styles.headerName, { color: colors.text.primary }]}>{displayName}</Text>
                {streak.streak >= 2 ? (
                  <View style={styles.headerStreakBadge}>
                    <Feather name="zap" size={9} color="#FF9500" />
                    <Text style={styles.headerStreakText}>{streak.streak}</Text>
                  </View>
                ) : null}
                <Feather name="chevron-right" size={13} color={colors.text.tertiary} />
              </View>
              <Text style={[styles.headerStatus, { color: colors.text.secondary }]}>
                {isStreaming ? "yazıyor..." : character.shortRole}
              </Text>
            </View>
          </Pressable>

          {isSibel ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowFortuneSheet(true);
              }}
              style={[styles.headerSideBtn, { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, backgroundColor: "rgba(139,92,246,0.15)", borderRadius: 12 }]}
              hitSlop={4}
            >
              <Text style={{ fontSize: 13 }}>☕</Text>
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#8B5CF6" }}>Fal Baktır</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (!user?.isVip) {
                    setShowVideoVIPModal(true);
                  } else {
                    router.push({ pathname: "/video-chat/[characterId]", params: { characterId: character.id } });
                  }
                }}
                style={styles.headerSideBtn}
                hitSlop={8}
              >
                <Feather name="video" size={18} color={user?.isVip ? colors.text.secondary : "#FFD700"} />
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCustomize(true);
                }}
                style={styles.headerSideBtn}
                hitSlop={8}
              >
                <Feather name="sliders" size={19} color={colors.text.secondary} />
              </Pressable>
            </>
          )}
        </View>
        {!isSibel && <RelationshipBar xp={charXp} />}
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
          {!user?.isVip && quota.loaded ? (
            <View style={styles.quotaBar}>
              <Feather
                name={quota.remaining === 0 ? "zap-off" : "zap"}
                size={11}
                color={quota.remaining === 0 ? "#FF3B30" : quota.remaining <= 3 ? "#FF9500" : colors.text.tertiary}
              />
              <Text style={[styles.quotaBarText, quota.remaining === 0 && { color: "#FF3B30" }, quota.remaining <= 3 && quota.remaining > 0 && { color: "#FF9500" }]}>
                {quota.remaining > 0
                  ? `${quota.remaining}/${quota.DAILY_LIMIT} mesaj`
                  : `Limit doldu · ${resetCountdown}`}
              </Text>
              {quota.remaining === 0 ? (
                <Pressable onPress={() => setShowQuotaPopup(true)} hitSlop={4}>
                  <Text style={[styles.quotaBarVipLink, { color: colors.accent }]}>VIP'e geç</Text>
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

      <FortuneSheet
        visible={showFortuneSheet}
        onClose={() => setShowFortuneSheet(false)}
        onSubmit={handleFortuneTell}
        characterName={settings.customName || character.name}
      />

      <QuotaPopup
        visible={showQuotaPopup}
        onClose={() => setShowQuotaPopup(false)}
        onGoMarket={() => {
          setShowQuotaPopup(false);
          router.push("/(tabs)/market");
        }}
        onWatchAd={async () => {
          await quota.addBonusMessages(5);
          setShowQuotaPopup(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Harika!", "+5 mesaj hakkı kazandın! 🎉", [{ text: "Tamam" }]);
        }}
        resetCountdown={resetCountdown}
        language={user?.language ?? "tr"}
      />

      <Modal visible={showVideoVIPModal} transparent animationType="fade" onRequestClose={() => setShowVideoVIPModal(false)} statusBarTranslucent>
        <View style={styles.quotaBackdrop} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowVideoVIPModal(false)} />
          <View style={[styles.quotaCard, { borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)" }]} pointerEvents="box-none">
            {Platform.OS === "ios" ? (
              <BlurView intensity={70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} pointerEvents="none" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? colors.surfaceStrong : "#F8F8FF" }]} pointerEvents="none" />
            )}
            <View style={styles.quotaIconWrap} pointerEvents="none">
              <LinearGradient colors={["#FFD700", "#FFB800"]} style={styles.quotaIconGrad}>
                <Feather name="video" size={26} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={[styles.quotaTitle, { color: colors.text.primary }]} pointerEvents="none">Video Sohbet VIP'e Özel</Text>
            <Text style={[styles.quotaDesc, { color: colors.text.secondary }]} pointerEvents="none">
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
              <Text style={[styles.quotaCloseText, { color: colors.text.tertiary }]}>Daha Sonra</Text>
            </Pressable>
          </View>
        </View>
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
    borderColor: "transparent",
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  headerName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
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
  quotaWatchAdBtn: {
    borderRadius: 14,
    overflow: "hidden",
    width: "100%",
    borderWidth: 1.5,
    borderColor: Colors.accent + "40",
    backgroundColor: Colors.accent + "08",
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  quotaWatchAdInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quotaWatchAdText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.accent,
  },
});
