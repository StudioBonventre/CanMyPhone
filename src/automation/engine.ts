import { capabilityV2 } from "./capabilityCatalogV2";
import type { ShortcutDefinition, ShortcutStep } from "./shortcutCompiler";

export type TriggerDriver =
  | "CANMYPHONE_MANUAL"
  | "CANMYPHONE_NATIVE"
  | "HOMEKIT"
  | "APPLE_SHORTCUTS_BRIDGE"
  | "PROVIDER"
  | "UNSUPPORTED";

export type ActionDriver =
  | "CANMYPHONE_NATIVE"
  | "HOMEKIT"
  | "CANMYPHONE_APP_INTENT"
  | "APPLE_SHORTCUTS_ACTION"
  | "PROVIDER"
  | "GUIDED"
  | "UNSUPPORTED";

export type AutomationRuntimePlan = {
  triggerDriver: TriggerDriver;
  actionDrivers: ActionDriver[];
  appleBridgeRequired: boolean;
  appleBridgePurpose: "NONE" | "TRIGGER_ONLY" | "TRIGGER_AND_ACTIONS";
  canmyphoneOwnsLogic: boolean;
  canmyphoneOwnsAllActions: boolean;
  providerRequired: boolean;
  installationHost: "CANMYPHONE_NATIVE" | "APPLE_PERSONAL_AUTOMATION" | "HOMEKIT" | "PROVIDER" | "UNSUPPORTED";
  triggerReliability: "FOREGROUND" | "BACKGROUND_EVENT" | "APPLE_SYSTEM" | "UNAVAILABLE";
  summary: string;
};

function triggerDriver(definition: ShortcutDefinition): TriggerDriver {
  const trigger = capabilityV2(definition.trigger.capabilityId);
  if (!trigger || trigger.role !== "trigger") return "UNSUPPORTED";
  if (definition.trigger.capabilityId === "trigger.manual") return "CANMYPHONE_MANUAL";
  if (["trigger.homekit-characteristic","trigger.homekit-time"].includes(definition.trigger.capabilityId)) return "HOMEKIT";
  if (trigger.executionModes.includes("DIRECT_PUBLIC_API")) return "CANMYPHONE_NATIVE";
  if (trigger.integration || trigger.executionModes.includes("THIRD_PARTY_API")) return "PROVIDER";
  if (trigger.executionModes.includes("PERSONAL_AUTOMATION")) return "APPLE_SHORTCUTS_BRIDGE";
  return "UNSUPPORTED";
}

function actionDriver(step: ShortcutStep, homekitTrigger = false): ActionDriver {
  const cap = capabilityV2(step.capabilityId);
  if (!cap || cap.role !== "action") return "UNSUPPORTED";
  if (homekitTrigger && step.capabilityId === "smart-home.light.set" && ["apple-home","apple home","homekit","home"].includes(String(step.parameters.provider ?? "").trim().toLowerCase())) return "HOMEKIT";
  if (cap.executionModes.includes("DIRECT_PUBLIC_API")) return "CANMYPHONE_NATIVE";
  const provider = typeof step.parameters.provider === "string" ? step.parameters.provider.trim().toLowerCase() : "";
  if (step.capabilityId.startsWith("smart-home.") && ["apple-home","apple home","homekit","home"].includes(provider)) return "CANMYPHONE_NATIVE";
  if (cap.integration || cap.executionModes.includes("THIRD_PARTY_API")) return "PROVIDER";
  if (cap.executionModes.includes("SHORTCUT") || cap.executionModes.includes("PERSONAL_AUTOMATION")) return "APPLE_SHORTCUTS_ACTION";
  if (cap.executionModes.includes("APP_INTENT")) return "CANMYPHONE_APP_INTENT";
  if (cap.fallback === "GUIDED_HANDOFF") return "GUIDED";
  return "UNSUPPORTED";
}

export function compileAutomationRuntime(definition: ShortcutDefinition): AutomationRuntimePlan {
  const trigger = triggerDriver(definition);
  const actions = definition.actions.map((action) => actionDriver(action, trigger === "HOMEKIT"));
  const hasAppleActions = actions.includes("APPLE_SHORTCUTS_ACTION");
  const bridgeForTrigger = trigger === "APPLE_SHORTCUTS_BRIDGE";
  const appleBridgeRequired = bridgeForTrigger || hasAppleActions;
  const homekitOnly = trigger === "HOMEKIT" && actions.length === 1 && actions[0] === "HOMEKIT" && definition.conditions.length === 0;
  const unsupportedCombination = actions.some(driver => driver === "UNSUPPORTED" || driver === "GUIDED") ||
    definition.conditions.length > 0 ||
    (hasAppleActions && (!bridgeForTrigger || actions.some(driver => driver !== "APPLE_SHORTCUTS_ACTION")));
  // No connector currently supplies a persistent, authenticated event transport.
  // The dispatcher accepts verified events, but a plan cannot be activated until
  // a connector actually installs such a source.
  const installationHost: AutomationRuntimePlan["installationHost"] = unsupportedCombination ? "UNSUPPORTED" : homekitOnly ? "HOMEKIT" : trigger === "HOMEKIT" || trigger === "PROVIDER" ? "UNSUPPORTED" : bridgeForTrigger ? "APPLE_PERSONAL_AUTOMATION" : trigger === "CANMYPHONE_NATIVE" || trigger === "CANMYPHONE_MANUAL" ? "CANMYPHONE_NATIVE" : "UNSUPPORTED";
  const providerRequired = trigger === "PROVIDER" || actions.includes("PROVIDER");
  const triggerReliability: AutomationRuntimePlan["triggerReliability"] =
    trigger === "CANMYPHONE_MANUAL" ? "FOREGROUND" :
    trigger === "CANMYPHONE_NATIVE" || trigger === "HOMEKIT" ? "BACKGROUND_EVENT" :
    trigger === "APPLE_SHORTCUTS_BRIDGE" ? "APPLE_SYSTEM" : "UNAVAILABLE";
  const canmyphoneOwnsAllActions = actions.every((driver) =>
    driver === "CANMYPHONE_NATIVE" || driver === "CANMYPHONE_APP_INTENT"
  );

  let appleBridgePurpose: AutomationRuntimePlan["appleBridgePurpose"] = "NONE";
  if (bridgeForTrigger && hasAppleActions) appleBridgePurpose = "TRIGGER_AND_ACTIONS";
  else if (bridgeForTrigger) appleBridgePurpose = "TRIGGER_ONLY";
  else if (hasAppleActions) appleBridgePurpose = "TRIGGER_AND_ACTIONS";

  let summary = "CanMyPhone kann diese Automation selbst ausführen.";
  if (installationHost === "UNSUPPORTED") {
    summary = "Für diese Trigger- und Aktionskombination gibt es noch keinen verlässlichen automatischen Installationsweg.";
  } else if (homekitOnly) {
    summary = "Apple Home führt Auslöser und Aktion nach der Installation aus.";
  } else if (trigger === "HOMEKIT") {
    summary = "Ein HomeKit-Auslöser kann nur mit direkt in Apple Home installierbaren Aktionen verbunden werden.";
  } else if (appleBridgePurpose === "TRIGGER_ONLY") {
    summary = "CanMyPhone führt die Automation aus. Apple Kurzbefehle liefert nur den System-Trigger.";
  } else if (appleBridgePurpose === "TRIGGER_AND_ACTIONS") {
    summary = "CanMyPhone verwaltet die Automation; einzelne iOS-Schritte laufen über Apple Kurzbefehle.";
  } else if (providerRequired) {
    summary = "CanMyPhone verwaltet die Automation; ein verbundener Dienst führt mindestens einen Schritt aus.";
  } else if (trigger === "UNSUPPORTED" || actions.includes("UNSUPPORTED")) {
    summary = "Mindestens ein Schritt kann noch nicht sicher ausgeführt werden.";
  }

  return {
    triggerDriver: trigger,
    actionDrivers: actions,
    appleBridgeRequired,
    appleBridgePurpose,
    canmyphoneOwnsLogic: true,
    canmyphoneOwnsAllActions,
    providerRequired,
    installationHost,
    triggerReliability,
    summary
  };
}
