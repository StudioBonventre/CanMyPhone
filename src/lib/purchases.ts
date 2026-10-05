import { Platform } from "react-native";
import { CanMyPhoneNative, type StoreProduct } from "../../modules/canmyphone-native";
import type { EntitlementState } from "../types";
import { ALL_PRO_PRODUCT_IDS, entitlementsFromActiveProducts } from "./entitlements";
import { loadEntitlementState, saveEntitlementState } from "./storage";

export type { StoreProduct } from "../../modules/canmyphone-native";
export { periodLabel, trialLabel, yearlySavingsPercent } from "./pricing";

export const LEGAL_LINKS = {
  /** Apple's standard licence agreement – accepted by App Review for subscriptions. */
  terms: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
  privacy: "https://github.com/StudioBonventre/CanMyPhone/blob/main/PRIVACY.md",
  manageSubscriptions: "https://apps.apple.com/account/subscriptions"
};

function storeAvailable(): boolean {
  return Platform.OS === "ios" && Boolean(CanMyPhoneNative?.storeProducts);
}

/** Products in display order: yearly first. Empty when the App Store is unreachable or not configured yet. */
export async function loadProProducts(): Promise<StoreProduct[]> {
  if (!storeAvailable() || !CanMyPhoneNative) return [];
  try {
    const products = await CanMyPhoneNative.storeProducts(ALL_PRO_PRODUCT_IDS);
    return ALL_PRO_PRODUCT_IDS
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is StoreProduct => Boolean(product));
  } catch {
    return [];
  }
}

/** Asks StoreKit what the person owns right now; falls back to the last known state offline. */
export async function refreshEntitlements(): Promise<EntitlementState> {
  const cached = await loadEntitlementState();
  if (!storeAvailable() || !CanMyPhoneNative) return cached;
  try {
    const next = entitlementsFromActiveProducts(await CanMyPhoneNative.storeActiveProductIds());
    await saveEntitlementState(next);
    return next;
  } catch {
    return cached;
  }
}

export type PurchaseOutcome = {
  state: EntitlementState;
  /** Short German message for the person, or null when nothing needs saying (e.g. cancelled). */
  message: string | null;
  success: boolean;
};

export async function purchasePro(productId: string): Promise<PurchaseOutcome> {
  const cached = await loadEntitlementState();
  if (!storeAvailable() || !CanMyPhoneNative) {
    return { state: cached, success: false, message: "Käufe sind in dieser Version noch nicht verfügbar." };
  }
  try {
    const result = await CanMyPhoneNative.storePurchase(productId);
    const state = entitlementsFromActiveProducts(result.activeProductIds);
    await saveEntitlementState(state);
    switch (result.status) {
      case "purchased":
        return { state, success: state.pro, message: state.pro ? "Willkommen bei CanMyPhone Pro!" : "Der Kauf wird noch bestätigt." };
      case "pending":
        return { state, success: false, message: "Der Kauf wartet auf Bestätigung, z. B. durch „Kaufen bitten“ in der Familie." };
      case "cancelled":
        return { state, success: false, message: null };
      case "unverified":
        return { state, success: false, message: "Apple konnte den Kauf nicht bestätigen. Bitte versuche es später erneut." };
      default:
        return { state, success: false, message: "Das hat leider nicht geklappt. Bitte versuche es später erneut." };
    }
  } catch {
    return { state: cached, success: false, message: "Der App Store ist gerade nicht erreichbar. Bitte versuche es später erneut." };
  }
}

export async function restorePurchases(): Promise<PurchaseOutcome> {
  const cached = await loadEntitlementState();
  if (!storeAvailable() || !CanMyPhoneNative) {
    return { state: cached, success: false, message: "Käufe sind in dieser Version noch nicht verfügbar." };
  }
  try {
    const state = entitlementsFromActiveProducts(await CanMyPhoneNative.storeRestore());
    await saveEntitlementState(state);
    return {
      state,
      success: state.pro,
      message: state.pro ? "Dein Pro-Abo ist wiederhergestellt." : "Für deinen Apple Account wurde kein aktives Pro-Abo gefunden."
    };
  } catch {
    return { state: cached, success: false, message: "Wiederherstellen hat nicht geklappt. Bitte prüfe deine Verbindung." };
  }
}
