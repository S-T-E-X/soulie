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

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { loadConversations, createConversation, getConversationByCharacter } = useChatContext();
  const [activeCategory, setActiveCategory] = React.useState("Tümü");

  useEffect(() => {
    loadConversations();
  }, []);

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
          <LinearGradient colors={["#4FC3F7", "#007AFF"]} style={styles.headerOrb} />
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
        contentInsetAdjustmentBehavior="automatic"
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
  headerOrb: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
