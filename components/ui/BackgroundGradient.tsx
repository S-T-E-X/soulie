import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";

interface Props {
  children: React.ReactNode;
  customColors?: [string, string, ...string[]];
  showBlobs?: boolean;
}

export function BackgroundGradient({ children, customColors, showBlobs = true }: Props) {
  const { colors } = useTheme();
  const gradientColors = customColors ?? (colors.backgroundGradient as [string, string, ...string[]]);
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {showBlobs && (
        <>
          <View style={[styles.blob1, { backgroundColor: colors.blobA }]} />
          <View style={[styles.blob2, { backgroundColor: colors.blobB }]} />
        </>
      )}
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
