import { CAPABILITY_CATALOG_V2, type CapabilityV2 } from "./capabilityCatalogV2";

export type ShortcutsParityDomain =
  | "triggers"
  | "system"
  | "media"
  | "navigation"
  | "communication"
  | "productivity"
  | "smart-home"
  | "third-party-apps";

export type ShortcutsParitySummary = {
  supported: CapabilityV2[];
  direct: CapabilityV2[];
  appleOrchestrated: CapabilityV2[];
  providerBacked: CapabilityV2[];
};

/**
 * Product target: understand the same automation *intent surface* people use in
 * Apple Shortcuts, while routing each step through the safest public mechanism.
 *
 * This deliberately does not claim that a third-party app can directly invoke
 * every Apple/other-app action. System-only and cross-app work remains routed
 * through Apple's Shortcuts/App Intents orchestration where required.
 */
export function shortcutsParitySummary(): ShortcutsParitySummary {
  const supported = CAPABILITY_CATALOG_V2.filter((cap) => cap.role === "trigger" || cap.role === "action");
  return {
    supported,
    direct: supported.filter((cap) => cap.executionModes.includes("DIRECT_PUBLIC_API")),
    appleOrchestrated: supported.filter((cap) =>
      cap.executionModes.includes("PERSONAL_AUTOMATION") || cap.executionModes.includes("SHORTCUT")
    ),
    providerBacked: supported.filter((cap) => cap.executionModes.includes("THIRD_PARTY_API"))
  };
}

export const SHORTCUTS_PARITY_PRINCIPLES = [
  "CanMyPhone owns natural-language understanding, automation state, conditions and policy.",
  "Use native public APIs when CanMyPhone can execute safely itself.",
  "Use provider APIs when a connected service exposes the required action.",
  "Use Apple Shortcuts/App Intents as the system orchestrator for Apple-owned triggers and cross-app actions.",
  "Never claim direct execution when iOS only exposes the capability through system orchestration."
] as const;
