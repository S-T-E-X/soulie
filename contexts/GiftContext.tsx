import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type GiftItem = {
  id: string;
  name: string;
  icon: string;
  colorFrom: string;
  colorTo: string;
  price: number;
  category: "basic" | "premium" | "rare";
};

export type CoinPackage = {
  id: string;
  coins: number;
  price: string;
  bonus?: number;
  isPopular?: boolean;
};

export type InventoryItem = {
  giftId: string;
  quantity: number;
};

export const GIFTS: GiftItem[] = [
  { id: "rose", name: "Gül", icon: "heart", colorFrom: "#FF6B6B", colorTo: "#FF1744", price: 50, category: "basic" },
  { id: "heart", name: "Kalp", icon: "heart", colorFrom: "#FF80AB", colorTo: "#F50057", price: 100, category: "basic" },
  { id: "star", name: "Yıldız", icon: "star", colorFrom: "#FFD700", colorTo: "#FF9500", price: 200, category: "premium" },
  { id: "crown", name: "Taç", icon: "award", colorFrom: "#B8860B", colorTo: "#FFD700", price: 500, category: "premium" },
  { id: "diamond", name: "Elmas", icon: "hexagon", colorFrom: "#4FC3F7", colorTo: "#0091EA", price: 1000, category: "rare" },
  { id: "fire", name: "Ateş", icon: "zap", colorFrom: "#FF6D00", colorTo: "#FF3D00", price: 300, category: "premium" },
  { id: "music", name: "Müzik", icon: "music", colorFrom: "#AB47BC", colorTo: "#6A1B9A", price: 150, category: "basic" },
  { id: "sun", name: "Güneş", icon: "sun", colorFrom: "#FFCC00", colorTo: "#FF9900", price: 250, category: "premium" },
];

export const COIN_PACKAGES: CoinPackage[] = [
  { id: "coins_100", coins: 100, price: "₺9,99" },
  { id: "coins_500", coins: 500, price: "₺39,99", bonus: 50, isPopular: true },
  { id: "coins_1200", coins: 1200, price: "₺79,99", bonus: 200 },
  { id: "coins_3000", coins: 3000, price: "₺149,99", bonus: 750 },
];

const COINS_KEY = "soulie_coins_v1";
const INVENTORY_KEY = "soulie_inventory_v1";

interface GiftContextValue {
  coins: number;
  inventory: InventoryItem[];
  isLoaded: boolean;
  addCoins: (amount: number) => Promise<void>;
  purchaseGift: (giftId: string) => Promise<boolean>;
  getInventoryCount: (giftId: string) => number;
  sendGift: (giftId: string) => Promise<boolean>;
}

const GiftContext = createContext<GiftContextValue | null>(null);

export function GiftProvider({ children }: { children: ReactNode }) {
  const [coins, setCoins] = useState(0);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [coinsRaw, invRaw] = await Promise.all([
          AsyncStorage.getItem(COINS_KEY),
          AsyncStorage.getItem(INVENTORY_KEY),
        ]);
        if (coinsRaw) {
          const parsed = parseInt(coinsRaw, 10);
          if (!isNaN(parsed)) { setCoins(parsed); }
          else { try { const obj = JSON.parse(coinsRaw); setCoins(obj.coins ?? 0); } catch { setCoins(0); } }
        }
        setInventory(invRaw ? JSON.parse(invRaw) : []);
      } catch {}
      setIsLoaded(true);
    })();
  }, []);

  const saveCoins = useCallback(async (amount: number) => {
    await AsyncStorage.setItem(COINS_KEY, String(amount));
  }, []);

  const saveInventory = useCallback(async (inv: InventoryItem[]) => {
    await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
  }, []);

  const addCoins = useCallback(async (amount: number) => {
    const newTotal = coins + amount;
    setCoins(newTotal);
    await saveCoins(newTotal);
  }, [coins, saveCoins]);

  const purchaseGift = useCallback(async (giftId: string): Promise<boolean> => {
    const gift = GIFTS.find((g) => g.id === giftId);
    if (!gift) return false;
    if (coins < gift.price) return false;

    const newCoins = coins - gift.price;
    setCoins(newCoins);
    await saveCoins(newCoins);

    const newInv = [...inventory];
    const idx = newInv.findIndex((i) => i.giftId === giftId);
    if (idx >= 0) {
      newInv[idx] = { ...newInv[idx], quantity: newInv[idx].quantity + 1 };
    } else {
      newInv.push({ giftId, quantity: 1 });
    }
    setInventory(newInv);
    await saveInventory(newInv);
    return true;
  }, [coins, inventory, saveCoins, saveInventory]);

  const getInventoryCount = useCallback((giftId: string): number => {
    return inventory.find((i) => i.giftId === giftId)?.quantity ?? 0;
  }, [inventory]);

  const sendGift = useCallback(async (giftId: string): Promise<boolean> => {
    const idx = inventory.findIndex((i) => i.giftId === giftId);
    if (idx < 0 || inventory[idx].quantity <= 0) return false;

    const newInv = [...inventory];
    if (newInv[idx].quantity <= 1) {
      newInv.splice(idx, 1);
    } else {
      newInv[idx] = { ...newInv[idx], quantity: newInv[idx].quantity - 1 };
    }
    setInventory(newInv);
    await saveInventory(newInv);
    return true;
  }, [inventory, saveInventory]);

  const value = useMemo(() => ({
    coins,
    inventory,
    isLoaded,
    addCoins,
    purchaseGift,
    getInventoryCount,
    sendGift,
  }), [coins, inventory, isLoaded, addCoins, purchaseGift, getInventoryCount, sendGift]);

  return <GiftContext.Provider value={value}>{children}</GiftContext.Provider>;
}

export function useGifts() {
  const ctx = useContext(GiftContext);
  if (!ctx) throw new Error("useGifts must be used within GiftProvider");
  return ctx;
}
