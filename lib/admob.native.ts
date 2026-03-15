import { Platform } from "react-native";
import Constants from "expo-constants";

const IOS_REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID ?? "ca-app-pub-3940256099942544/1712485313";
const ANDROID_REWARDED_ID = process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID ?? "ca-app-pub-3940256099942544/5354046379";

export const REWARDED_AD_UNIT_ID = Platform.OS === "ios" ? IOS_REWARDED_ID : ANDROID_REWARDED_ID;

const isExpoGo = Constants.appOwnership === "expo";

export type AdResult = { rewarded: boolean; error?: string };

function simulateAd(): Promise<AdResult> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ rewarded: true }), 5000);
  });
}

async function loadNativeAd(): Promise<AdResult> {
  return new Promise((resolve) => {
    try {
      const { RewardedAd, RewardedAdEventType } = require("react-native-google-mobile-ads");
      const ad = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
        requestNonPersonalizedAdsOnly: false,
      });

      let rewarded = false;

      const unsubLoad = ad.addAdEventListener(RewardedAdEventType.LOADED, () => ad.show());
      const unsubEarn = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        rewarded = true;
      });
      const unsubClose = ad.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        unsubLoad();
        unsubEarn();
        unsubClose();
        resolve({ rewarded });
      });
      const unsubError = ad.addAdEventListener(RewardedAdEventType.ERROR, (err: any) => {
        unsubLoad();
        unsubEarn();
        unsubClose();
        unsubError();
        resolve({ rewarded: false, error: err?.message });
      });

      ad.load();
    } catch (e: any) {
      resolve({ rewarded: true });
    }
  });
}

export function showRewardedAd(): Promise<AdResult> {
  if (isExpoGo) {
    return simulateAd();
  }
  return loadNativeAd();
}
