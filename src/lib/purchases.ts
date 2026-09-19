import { CanMyPhoneNative } from "../../modules/canmyphone-native";
import type { EntitlementState } from "../types";
import { DEFAULT_ENTITLEMENTS } from "./entitlements";
import { loadEntitlementState, saveEntitlementState } from "./storage";

export const PRO_MONTHLY_PRODUCT_ID = "com.studiobonventre.canmyphone.pro.monthly";
export const PRO_YEARLY_PRODUCT_ID = "com.studiobonventre.canmyphone.pro.yearly";
export const PRO_PRODUCT_IDS = [PRO_MONTHLY_PRODUCT_ID, PRO_YEARLY_PRODUCT_ID] as const;

export type ProProductId = typeof PRO_PRODUCT_IDS[number];

export type ProStoreProduct = {
  id: string;
  displayName: string;
  description: string;
  displayPrice: string;
  price: number;
  type: string;
  subscriptionPeriodValue?: number;
  subscriptionPeriodUnit?: string;
};

export type StorePurchaseStatus = "purchased" | "pending" | "cancelled" | "failed" | "unavailable";

export type ProPurchaseResult = {
  status: StorePurchaseStatus;
  message: string;
  state: EntitlementState;
};

export function isProProductId(value: string): value is ProProductId {
  return (PRO_PRODUCT_IDS as readonly string[]).includes(value);
}

export function mergeStoreProState(state: EntitlementState, pro: boolean): EntitlementState {
  return { ...state, pro };
}

async function cachedState(): Promise<EntitlementState> {
  return await loadEntitlementState() ?? DEFAULT_ENTITLEMENTS;
}

export async function fetchProProducts(): Promise<ProStoreProduct[]> {
  const fn = CanMyPhoneNative?.storeProducts;
  if (typeof fn !== "function") return [];

  try {
    const products = await fn.call(CanMyPhoneNative, [...PRO_PRODUCT_IDS]);
    return products
      .filter((product) => isProProductId(product.id))
      .sort((a, b) => {
        if (a.id === PRO_YEARLY_PRODUCT_ID) return -1;
        if (b.id === PRO_YEARLY_PRODUCT_ID) return 1;
        return a.price - b.price;
      });
  } catch {
    return [];
  }
}

export async function refreshProEntitlement(): Promise<EntitlementState> {
  const stored = await cachedState();
  const fn = CanMyPhoneNative?.currentStoreEntitlements;
  if (typeof fn !== "function") return stored;

  try {
    const result = await fn.call(CanMyPhoneNative, [...PRO_PRODUCT_IDS]);
    const next = mergeStoreProState(stored, result.pro);
    await saveEntitlementState(next);
    return next;
  } catch {
    return stored;
  }
}

export async function purchasePro(productId: string): Promise<ProPurchaseResult> {
  const state = await cachedState();
  if (!isProProductId(productId)) {
    return { status: "failed", message: "Dieses CanMyPhone-Pro-Produkt ist nicht bekannt.", state };
  }

  const fn = CanMyPhoneNative?.purchaseProduct;
  if (typeof fn !== "function") {
    return {
      status: "unavailable",
      message: "Dein installierter CanMyPhone-Build enthält StoreKit noch nicht. Installiere den aktuellen Development Build.",
      state
    };
  }

  try {
    const result = await fn.call(CanMyPhoneNative, productId);
    if (result.status === "purchased") {
      const refreshed = await refreshProEntitlement();
      return { status: refreshed.pro ? "purchased" : "failed", message: result.message, state: refreshed };
    }
    return { status: result.status, message: result.message, state };
  } catch {
    return { status: "failed", message: "Der Kauf konnte gerade nicht abgeschlossen werden.", state };
  }
}

export async function restoreProPurchases(): Promise<ProPurchaseResult> {
  const state = await cachedState();
  const fn = CanMyPhoneNative?.restorePurchases;
  if (typeof fn !== "function") {
    return {
      status: "unavailable",
      message: "Dein installierter CanMyPhone-Build enthält StoreKit noch nicht. Installiere den aktuellen Development Build.",
      state
    };
  }

  try {
    const restored = await fn.call(CanMyPhoneNative, [...PRO_PRODUCT_IDS]);
    const next = mergeStoreProState(state, restored.pro);
    await saveEntitlementState(next);
    return {
      status: restored.pro ? "purchased" : "failed",
      message: restored.pro ? "CanMyPhone Pro wurde wiederhergestellt." : "Für diesen Apple Account wurde kein aktives CanMyPhone-Pro-Abo gefunden.",
      state: next
    };
  } catch {
    return { status: "failed", message: "Käufe konnten gerade nicht wiederhergestellt werden.", state };
  }
}
