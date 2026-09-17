import type { EntitlementState } from "../types";

export type AutomaticActionAccess = {
  allowed: boolean;
  costCredits: number;
  reason: "pro" | "first-free" | "credit" | "locked";
};

export const DEFAULT_ENTITLEMENTS: EntitlementState = {
  pro: false,
  credits: 0,
  freeAutomaticActionUsed: false
};

/**
 * Pre-alpha development clients need to exercise every premium path before the
 * StoreKit purchase/restore flow is connected. This is compile-time development
 * behavior only; release bundles keep the persisted entitlement rules below.
 */
export function developmentPremiumEnabled(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__ === true;
}

export function automaticActionAccess(state: EntitlementState): AutomaticActionAccess {
  if (state.pro) return { allowed: true, costCredits: 0, reason: "pro" };
  if (!state.freeAutomaticActionUsed) return { allowed: true, costCredits: 0, reason: "first-free" };
  if (state.credits > 0) return { allowed: true, costCredits: 1, reason: "credit" };
  return { allowed: false, costCredits: 1, reason: "locked" };
}

/** Only call after an automatic action actually succeeds. */
export function consumeAutomaticAction(state: EntitlementState): EntitlementState {
  const access = automaticActionAccess(state);
  if (!access.allowed) return state;
  if (access.reason === "pro") return state;
  if (access.reason === "first-free") return { ...state, freeAutomaticActionUsed: true };
  return { ...state, credits: Math.max(0, state.credits - 1) };
}

export function addCredits(state: EntitlementState, credits: number): EntitlementState {
  if (!Number.isFinite(credits) || credits <= 0) return state;
  return { ...state, credits: state.credits + Math.floor(credits) };
}

export function setPro(state: EntitlementState, pro: boolean): EntitlementState {
  return { ...state, pro };
}
