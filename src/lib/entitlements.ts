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

export function automaticActionAccess(state: EntitlementState): AutomaticActionAccess {
  if (state.pro) return { allowed: true, costCredits: 0, reason: "pro" };
  if (!state.freeAutomaticActionUsed) return { allowed: true, costCredits: 0, reason: "first-free" };
  if (state.credits > 0) return { allowed: true, costCredits: 1, reason: "credit" };
  return { allowed: false, costCredits: 1, reason: "locked" };
}

export function proFeatureAccess(state: EntitlementState): boolean {
  return state.pro;
}

export type AutomationTier = "basic-plan" | "single-step" | "advanced-multi-step" | "third-party" | "proactive-suggestions";

export function automationTierAccess(state: EntitlementState, tier: AutomationTier): boolean {
  if (tier === "basic-plan" || tier === "single-step") return true;
  return state.pro;
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
