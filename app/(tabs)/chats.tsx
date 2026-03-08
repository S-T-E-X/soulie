import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import { useChatContext, type Conversation } from "@/contexts/ChatContext";
import { getCharacter } from "@/constants/characters";
import Colors from "@/constants/colors";

function ChatRow({ conversation, index }: { conversation: Conversation; index: number }) {
  const character = getCharacter(conversation.characterId);
  if (!character) return null;

  const timeAgo = () => {
    const diff = Date.now() - conversation.updatedAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "şimdi";
    if (mins < 60) return `${mins}dk`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}s`;
    return `${Math.floor(hours / 24)}g`;
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(18)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/chat/[id]", params: { id: conversation.id } });
        }}
        style={({ pressed }) => [styles.chatRow, pressed && { opacity: 0.75 }]}
      >
        <View style={styles.avatarContainer}>
          <Image source={character.image} style={styles.avatar} />
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatTop}>
            <Text style={styles.charName}>{character.name}</Text>
            <Text style={styles.time}>{timeAgo()}</Text>
          </View>
          <View style={styles.chatBottom}>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {conversation.lastMessage || `${character.name} ile sohbet başladı`}
            </Text>
            <View style={styles.rolePill}>
              <Text style={styles.roleLabel}>{character.shortRole}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <LinearGradient
        colors={["rgba(0,122,255,0.10)", "rgba(0,122,255,0.03)"]}
        style={styles.emptyIcon}
      >
        <Feather name="message-circle" size={28} color={Colors.accent} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Henüz sohbet yok</Text>
      <Text style={styles.emptySubtitle}>
        Keşfet sayfasından bir AI arkadaş seç ve sohbet başlat
      </Text>
      <Pressable
        onPress={() => router.push("/(tabs)/explore")}
        style={styles.emptyButton}
      >
        <LinearGradient
          colors={[Colors.userBubble.from, Colors.userBubble.to]}
          style={styles.emptyButtonGrad}
        >
          <Text style={styles.emptyButtonText}>Keşfete Git</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const { conversations, isLoaded, loadConversations } = useChatContext();

  useEffect(() => {
    loadConversations();
  }, []);

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <BackgroundGradient>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.headerTitle}>Sohbetler</Text>
        <Text style={styles.headerSub}>{sorted.length} aktif sohbet</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <ChatRow conversation={item} index={index} />}
        ListEmptyComponent={isLoaded ? <EmptyState /> : null}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
    gap: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
  },
  list: {
    paddingTop: 8,
    flexGrow: 1,
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: "transparent",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E5E5EA",
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#34C759",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  chatInfo: {
    flex: 1,
    gap: 5,
  },
  chatTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  charName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.text.tertiary,
  },
  chatBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  lastMsg: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    letterSpacing: -0.1,
  },
  rolePill: {
    backgroundColor: "rgba(0,122,255,0.08)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.accent,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.04)",
    marginLeft: 86,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text.primary,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 21,
  },
  emptyButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  emptyButtonGrad: {
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  emptyButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
