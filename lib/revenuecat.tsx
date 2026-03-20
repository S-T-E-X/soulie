import React, { createContext, useContext } from "react";
import { Alert, Platform } from "react-native";
import Purchases, {
  type PurchasesOfferings,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";

const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? "";
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? "";
const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY ?? "";

export const REVENUECAT_VIP_ENTITLEMENT = "vip";
export const REVENUECAT_VIP_OFFERING = "default";
export const REVENUECAT_COINS_OFFERING = "coins";

function getRevenueCatApiKey(): string {
  if (Platform.OS === "web") {
    return REVENUECAT_TEST_API_KEY || REVENUECAT_IOS_API_KEY;
  }
  if (__DEV__) {
    return REVENUECAT_TEST_API_KEY || REVENUECAT_IOS_API_KEY;
  }
  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;
  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat() {
  try {
    const apiKey = getRevenueCatApiKey();
    if (!apiKey) {
      console.warn("[RevenueCat] No API key found");
      return;
    }
    Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    console.log("[RevenueCat] Initialized with key:", apiKey.slice(0, 12) + "...");
  } catch (e) {
    console.warn("[RevenueCat] Init failed:", e);
  }
}

export async function purchaseByIdentifier(
  packageIdentifier: string,
  offeringIdentifier: string
): Promise<CustomerInfo> {
  const offerings = await Purchases.getOfferings();
  console.log("[RevenueCat] All offerings:", Object.keys(offerings.all));
  console.log("[RevenueCat] Current offering:", offerings.current?.identifier);

  let pkg: PurchasesPackage | undefined;

  const targetOffering = offerings.all[offeringIdentifier] ?? offerings.current;
  pkg = targetOffering?.availablePackages?.find((p) => p.identifier === packageIdentifier);

  if (!pkg) {
    for (const offering of Object.values(offerings.all)) {
      pkg = offering.availablePackages.find((p) => p.identifier === packageIdentifier);
      if (pkg) break;
    }
  }

  if (!pkg && offerings.current) {
    pkg = offerings.current.availablePackages.find((p) => p.identifier === packageIdentifier);
  }

  if (!pkg) {
    console.warn("[RevenueCat] Package not found:", packageIdentifier, "in any offering");
    throw new Error("PACKAGE_NOT_FOUND");
  }

  console.log("[RevenueCat] Purchasing package:", pkg.identifier);
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

function useSubscriptionContext() {
  const customerInfoQuery = useQuery<CustomerInfo>({
    queryKey: ["revenuecat", "customer-info"],
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
    retry: 2,
  });

  const offeringsQuery = useQuery<PurchasesOfferings>({
    queryKey: ["revenuecat", "offerings"],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
    retry: 2,
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

  const purchaseByIdMutation = useMutation<
    CustomerInfo,
    Error,
    { packageId: string; offeringId: string }
  >({
    mutationFn: ({ packageId, offeringId }) =>
      purchaseByIdentifier(packageId, offeringId),
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

  const vipOffering =
    offeringsQuery.data?.all?.[REVENUECAT_VIP_OFFERING] ??
    offeringsQuery.data?.current ??
    null;

  const coinsOffering =
    offeringsQuery.data?.all?.[REVENUECAT_COINS_OFFERING] ??
    null;

  return {
    customerInfo: customerInfoQuery.data,
    vipOffering,
    coinsOffering,
    allOfferings: offeringsQuery.data,
    isVip,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    purchaseById: purchaseByIdMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending || purchaseByIdMutation.isPending,
    isRestoring: restoreMutation.isPending,
    purchaseError: purchaseMutation.error,
    refetchCustomerInfo: customerInfoQuery.refetch,
    refetchOfferings: offeringsQuery.refetch,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
