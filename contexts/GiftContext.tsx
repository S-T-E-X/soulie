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
  imageKey: string;
  price: number;
};

export const GIFT_IMAGES: Record<string, any> = {
  bear: require("../assets/gifts/bear.png"),
  cat: require("../assets/gifts/cat.png"),
  crown: require("../assets/gifts/crown.png"),
  diamond: require("../assets/gifts/diamond.png"),
  heart: require("../assets/gifts/heart.png"),
  ring: require("../assets/gifts/ring.png"),
  rose: require("../assets/gifts/rose.png"),
  star: require("../assets/gifts/star.png"),
  suprizebox: require("../assets/gifts/suprizebox.png"),
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
  { id: "rose", name: "Gül", imageKey: "rose", price: 50 },
  { id: "heart", name: "Kalp", imageKey: "heart", price: 100 },
  { id: "bear", name: "Ayıcık", imageKey: "bear", price: 150 },
  { id: "cat", name: "Kedi", imageKey: "cat", price: 150 },
  { id: "star", name: "Yıldız", imageKey: "star", price: 200 },
  { id: "suprizebox", name: "Sürpriz", imageKey: "suprizebox", price: 300 },
  { id: "crown", name: "Taç", imageKey: "crown", price: 500 },
  { id: "ring", name: "Yüzük", imageKey: "ring", price: 750 },
  { id: "diamond", name: "Elmas", imageKey: "diamond", price: 1000 },
];

export const COIN_PACKAGES: CoinPackage[] = [
  { id: "coins_100", coins: 100, price: "$1.49" },
  { id: "coins_550", coins: 550, price: "$3.99" },
  { id: "coins_1400", coins: 1400, price: "$6.99" },
  { id: "coins_3750", coins: 3750, price: "$12.99" },
  { id: "coins_11000", coins: 11000, price: "$24.99", bonus: 1000, isPopular: true },
];

const COINS_KEY = "soulie_coins_v1";
const INVENTORY_KEY = "soulie_inventory_v1";

interface GiftContextValue {
  coins: number;
  inventory: InventoryItem[];
  isLoaded: boolean;
  addCoins: (amount: number) => Promise<void>;
  spendCoins: (amount: number) => Promise<boolean>;
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

  const spendCoins = useCallback(async (amount: number): Promise<boolean> => {
    if (coins < amount) return false;
    const newTotal = coins - amount;
    setCoins(newTotal);
    await saveCoins(newTotal);
    return true;
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
    spendCoins,
    purchaseGift,
    getInventoryCount,
    sendGift,
  }), [coins, inventory, isLoaded, addCoins, spendCoins, purchaseGift, getInventoryCount, sendGift]);

  return <GiftContext.Provider value={value}>{children}</GiftContext.Provider>;
}

export function useGifts() {
  const ctx = useContext(GiftContext);
  if (!ctx) throw new Error("useGifts must be used within GiftProvider");
  return ctx;
}
