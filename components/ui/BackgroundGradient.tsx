import React from "react";
import { StyleSheet, View, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export function BackgroundGradient({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#E8EFF8", "#F2F2F7", "#EEF1F8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.blob1,
          { backgroundColor: "rgba(0, 122, 255, 0.07)" },
        ]}
      />
      <View
        style={[
          styles.blob2,
          { backgroundColor: "rgba(88, 86, 214, 0.05)" },
        ]}
      />
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
