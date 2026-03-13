import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";

export function BackgroundGradient({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob1, { backgroundColor: colors.blobA }]} />
      <View style={[styles.blob2, { backgroundColor: colors.blobB }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blob1: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -80,
    right: -80,
  },
  blob2: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: 100,
    left: -60,
  },
});
