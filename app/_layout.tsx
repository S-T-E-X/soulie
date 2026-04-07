import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { ChatProvider } from "@/contexts/ChatContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { GiftProvider } from "@/contexts/GiftContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CustomCharProvider } from "@/contexts/CustomCharContext";
import { useGlobalNotificationScheduler } from "@/hooks/useAutoMessages";
import { initializeRevenueCat, SubscriptionProvider, useSubscription } from "@/lib/revenuecat";

initializeRevenueCat();

SplashScreen.preventAutoHideAsync();

function RevenueCatVipSync() {
  const { isVip: rcVip, customerInfo, refetchOfferings, refetchCustomerInfo } = useSubscription();
  const { user, updateProfile } = useAuth();
  const prevRcVip = useRef<boolean | null>(null);
  const prevUserId = useRef<string | null>(null);

  // Log in / log out of RevenueCat when auth state changes
  useEffect(() => {
    if (Platform.OS === "web") return;

    const userId = user?.id || user?.userId || null;

    if (!userId) {
      // User logged out — log out of RevenueCat
      if (prevUserId.current) {
        prevUserId.current = null;
        Purchases.logOut().catch(() => {});
      }
      return;
    }

    // New user logged in (or changed)
    if (userId !== prevUserId.current) {
      prevUserId.current = userId;
      Purchases.logIn(userId)
        .then(() => {
          // After login, refresh offerings and customer info so purchases work immediately
          refetchOfferings();
          refetchCustomerInfo();
          console.log("[RevenueCat] logIn successful for userId:", userId);
        })
        .catch((e) => console.warn("[RevenueCat] logIn failed:", e));
    }
  }, [user?.id, user?.userId]);

  // Sync RevenueCat VIP status to local user state
  useEffect(() => {
    if (!customerInfo || !user) return;

    if (rcVip && prevRcVip.current !== true) {
      const entitlement = customerInfo.entitlements.active["vip"];
      const expiryMs = entitlement?.expirationDate
        ? new Date(entitlement.expirationDate).getTime()
        : Date.now() + 31 * 24 * 60 * 60 * 1000;
      const plan = user.vipPlan ?? "monthly";
      if (!user.isVip || (user.vipExpiry && user.vipExpiry < Date.now())) {
        updateProfile({ isVip: true, vipPlan: plan, vipExpiry: expiryMs });
      }
    }

    if (!rcVip && prevRcVip.current === true) {
      if (user.isVip && user.vipExpiry && user.vipExpiry < Date.now()) {
        updateProfile({ isVip: false, vipPlan: undefined, vipExpiry: undefined });
      }
    }

    prevRcVip.current = rcVip;
  }, [rcVip, customerInfo]);

  return null;
}

function RootLayoutNav() {
  useGlobalNotificationScheduler();
  return (
    <Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" options={{ animation: "fade" }} />
      <Stack.Screen name="privacy" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="profile" options={{ animation: "ios_from_right" }} />
      <Stack.Screen name="tarot" options={{ animation: "ios_from_right" }} />
      <Stack.Screen name="feedback" options={{ animation: "ios_from_right" }} />
      <Stack.Screen name="admin" options={{ animation: "ios_from_right" }} />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="character/[characterId]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="video-chat/[characterId]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SubscriptionProvider>
          <ThemeProvider>
            <AuthProvider>
              <RevenueCatVipSync />
              <ChatProvider>
                <GiftProvider>
                  <CustomCharProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <KeyboardProvider>
                        <RootLayoutNav />
                      </KeyboardProvider>
                    </GestureHandlerRootView>
                  </CustomCharProvider>
                </GiftProvider>
              </ChatProvider>
            </AuthProvider>
          </ThemeProvider>
        </SubscriptionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
