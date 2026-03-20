import React, { createContext, useContext } from "react";
import { Platform } from "react-native";
import Purchases, { type PurchasesOfferings, type CustomerInfo, type PurchasesPackage } from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_VIP_ENTITLEMENT = "vip";
export const REVENUECAT_VIP_OFFERING = "default";
export const REVENUECAT_COINS_OFFERING = "coins";

function getRevenueCatApiKey(): string {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error("RevenueCat API keys not configured");
  }
  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat() {
  try {
    const apiKey = getRevenueCatApiKey();
    Purchases.setLogLevel(Purchases.LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey });
    console.log("[RevenueCat] Initialized");
  } catch (e) {
    console.warn("[RevenueCat] Init failed:", e);
  }
}

function useSubscriptionContext() {
  const customerInfoQuery = useQuery<CustomerInfo>({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
  });

  const vipOfferingsQuery = useQuery<PurchasesOfferings>({
    queryKey: ["revenuecat", "vip-offerings"],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
  });

  const coinsOfferingsQuery = useQuery<PurchasesOfferings>({
    queryKey: ["revenuecat", "coins-offerings"],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
  });

  const purchaseMutation = useMutation<CustomerInfo, Error, PurchasesPackage>({
    mutationFn: async (pkg) => {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo;
    },
    onSuccess: () => {
      customerInfoQuery.refetch();
    },
  });

  const restoreMutation = useMutation<CustomerInfo>({
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: () => {
      customerInfoQuery.refetch();
    },
  });

  const isVip =
    customerInfoQuery.data?.entitlements.active?.[REVENUECAT_VIP_ENTITLEMENT] !== undefined;

  const vipOffering = vipOfferingsQuery.data?.all?.[REVENUECAT_VIP_OFFERING] ?? vipOfferingsQuery.data?.current ?? null;
  const coinsOffering = coinsOfferingsQuery.data?.all?.[REVENUECAT_COINS_OFFERING] ?? null;

  return {
    customerInfo: customerInfoQuery.data,
    vipOffering,
    coinsOffering,
    isVip,
    isLoading: customerInfoQuery.isLoading || vipOfferingsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error,
    refetchCustomerInfo: customerInfoQuery.refetch,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
