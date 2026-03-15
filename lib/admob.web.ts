export type AdResult = { rewarded: boolean; error?: string };

export const REWARDED_AD_UNIT_ID = "";

export function showRewardedAd(): Promise<AdResult> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ rewarded: true }), 5000);
  });
}
