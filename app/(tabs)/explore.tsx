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
import Animated, { FadeInDown } from "react-native-reanimated";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { BackgroundGradient } from "@/components/ui/BackgroundGradient";
import { CharacterCard } from "@/components/explore/CharacterCard";
import { CHARACTERS } from "@/constants/characters";
import { useChatContext } from "@/contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

const CATEGORIES = ["Tümü", "Sevgili", "Arkadaş", "Mentor"];

const LEVEL_XP_TABLE = [0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250, 2750];

function getUserLevel(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_XP_TABLE.length - 1; i++) {
    if (xp >= LEVEL_XP_TABLE[i + 1]) level = i + 2;
    else break;
  }
  return Math.min(level, 10);
}

function getLevelFrameColors(level: number): [string, string] {
  if (level <= 2) return ["#8E8E93", "#636366"];
  if (level <= 4) return [Colors.userBubble.from, Colors.userBubble.to];
  if (level <= 6) return ["#5856D6", "#AF52DE"];
  if (level <= 8) return ["#FF9500", "#FF6B00"];
  return ["#FFD700", "#FFB800"];
}

function UserAvatarBadge({ xp, name }: { xp: number; name?: string }) {
  const level = getUserLevel(xp);
  const frameColors = getLevelFrameColors(level);
  const initial = name?.charAt(0).toUpperCase() ?? "S";

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/settings")}
      style={({ pressed }) => [styles.avatarBadge, pressed && { opacity: 0.8 }]}
      hitSlop={6}
    >
      <LinearGradient colors={frameColors} style={styles.avatarFrame}>
        <LinearGradient
          colors={[Colors.userBubble.from, Colors.userBubble.to]}
          style={styles.avatarInner}
        >
          <Text style={styles.avatarInitial}>{initial}</Text>
        </LinearGradient>
      </LinearGradient>
      <View style={styles.levelBadge}>
        <Text style={styles.levelBadgeText}>{level}</Text>
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { loadConversations, conversations, getConversationByCharacter } = useChatContext();
  const [activeCategory, setActiveCategory] = React.useState("Tümü");

  useEffect(() => {
    loadConversations();
  }, []);

  const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
  const xp = totalMessages * 10 + conversations.length * 5;

  const filtered = activeCategory === "Tümü"
    ? CHARACTERS
    : CHARACTERS.filter((c) => c.role === activeCategory || (activeCategory === "Mentor" && c.role === "Yaşam Koçu") || (activeCategory === "Mentor" && c.role === "Çalışma Arkadaşı"));

  const handleCharacterPress = useCallback((characterId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/character/[characterId]", params: { characterId } });
  }, []);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderItem = ({ item, index }: any) => (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify().damping(18)}
      style={styles.cardWrapper}
    >
      <CharacterCard
        character={item}
        onPress={() => handleCharacterPress(item.id)}
        hasChat={!!getConversationByCharacter(item.id)}
      />
    </Animated.View>
  );

  return (
    <BackgroundGradient>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>
              Merhaba{user?.name ? `, ${user.name}` : ""} 👋
            </Text>
            <Text style={styles.headerTitle}>Karakterleri Keşfet</Text>
          </View>
          <UserAvatarBadge xp={xp} name={user?.name} />
        </View>

        <View style={styles.categories}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[styles.catBtn, activeCategory === cat && styles.catBtnActive]}
            >
              <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + 100 },
        ]}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </BackgroundGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.text.primary,
    letterSpacing: -0.7,
  },
  avatarBadge: {
    position: "relative",
  },
  avatarFrame: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 2.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  avatarInitial: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  levelBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  levelBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  categories: {
    flexDirection: "row",
    gap: 8,
  },
  catBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  catBtnActive: {
    backgroundColor: Colors.accent,
  },
  catText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.text.secondary,
  },
  catTextActive: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  grid: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  row: {
    justifyContent: "space-between",
  },
  cardWrapper: {
    flex: 1,
    maxWidth: "50%",
  },
});
