import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  StatusBar,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import { ConversationCard } from "@/components/chat/ConversationCard";
import { useChatContext, type Conversation } from "@/contexts/ChatContext";
import Colors from "@/constants/colors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function NewChatButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[styles.newChatButton, animStyle]}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 12 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 10 });
      }}
      onPress={onPress}
    >
      <LinearGradient
        colors={[Colors.userBubble.from, Colors.userBubble.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.newChatGradient}
      >
        <Feather name="plus" size={22} color="#FFFFFF" />
      </LinearGradient>
    </AnimatedPressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={["rgba(0,122,255,0.12)", "rgba(0,122,255,0.04)"]}
        style={styles.emptyIcon}
      >
        <Feather name="message-circle" size={28} color={Colors.accent} />
      </LinearGradient>
      <Text style={styles.emptyTitle}>Henüz sohbet yok</Text>
      <Text style={styles.emptySubtitle}>
        Lumina ile bir konuşma başlatmak için{"\n"}sağ alttaki butona dokun
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { conversations, isLoaded, loadConversations, createConversation, deleteConversation } =
    useChatContext();

  useEffect(() => {
    loadConversations();
  }, []);

  const handleNewChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const conv = createConversation();
    router.push({ pathname: "/chat/[id]", params: { id: conv.id } });
  }, [createConversation]);

  const handleOpenChat = useCallback((id: string) => {
    router.push({ pathname: "/chat/[id]", params: { id } });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteConversation(id);
    },
    [deleteConversation]
  );

  const renderItem = ({ item, index }: { item: Conversation; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 40).springify().damping(18)}>
      <ConversationCard
        conversation={item}
        onPress={() => handleOpenChat(item.id)}
        onDelete={() => handleDelete(item.id)}
      />
    </Animated.View>
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <BackgroundGradient>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={50}
            tint="light"
            style={[StyleSheet.absoluteFill, styles.headerBlur]}
          />
        ) : null}
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Lumina</Text>
            <Text style={styles.headerSubtitle}>Kişisel AI Dostunum</Text>
          </View>
          <View style={styles.headerIcon}>
            <LinearGradient colors={["#4FC3F7", "#007AFF"]} style={styles.lumiGradient} />
          </View>
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={isLoaded ? <EmptyState /> : null}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <View style={[styles.fab, { bottom: bottomPad + 28 }]}>
        <NewChatButton onPress={handleNewChat} />
      </View>
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  headerBlur: {
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    marginTop: 1,
    letterSpacing: -0.1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  lumiGradient: {
    flex: 1,
  },
  listContent: {
    paddingTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
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
  fab: {
    position: "absolute",
    right: 24,
  },
  newChatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  newChatGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
