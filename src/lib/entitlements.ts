import type { EntitlementState, Solution } from "../types";

/** App Store product ids. Create exactly these in App Store Connect (see docs/MONETIZATION.md). */
export const PRO_PRODUCT_IDS = {
  monthly: "com.studiobonventre.canmyphone.pro.monthly",
  yearly: "com.studiobonventre.canmyphone.pro.yearly"
} as const;

export const ALL_PRO_PRODUCT_IDS: string[] = [PRO_PRODUCT_IDS.yearly, PRO_PRODUCT_IDS.monthly];

export const DEFAULT_ENTITLEMENTS: EntitlementState = { pro: false };

/**
 * Tips, guides, search and the app's own direct actions are always free.
 * Only automation recipes marked "pro" need the subscription.
 */
export function isLocked(solution: Solution, state: EntitlementState): boolean {
  if (state.pro) return false;
  return solution.automation?.tier === "pro";
}

/** Turns the list of active StoreKit product ids into the app's entitlement state. */
export function entitlementsFromActiveProducts(activeProductIds: string[], now = Date.now()): EntitlementState {
  const productId = ALL_PRO_PRODUCT_IDS.find((id) => activeProductIds.includes(id));
  return productId ? { pro: true, productId, checkedAt: now } : { pro: false, checkedAt: now };
}

/** Accepts older persisted shapes (v0.11 credits model) without crashing. */
export function normalizeEntitlements(raw: unknown): EntitlementState {
  if (!raw || typeof raw !== "object") return DEFAULT_ENTITLEMENTS;
  const value = raw as Partial<EntitlementState>;
  return {
    pro: value.pro === true,
    productId: typeof value.productId === "string" ? value.productId : undefined,
    checkedAt: typeof value.checkedAt === "number" ? value.checkedAt : undefined
  };
}
