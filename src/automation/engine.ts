import { capabilityV2 } from "./capabilityCatalogV2";
import type { ShortcutDefinition } from "./shortcutCompiler";

export type TriggerDriver =
  | "CANMYPHONE_MANUAL"
  | "APPLE_SHORTCUTS_BRIDGE"
  | "PROVIDER"
  | "UNSUPPORTED";

export type ActionDriver =
  | "CANMYPHONE_NATIVE"
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
  summary: string;
};

function triggerDriver(definition: ShortcutDefinition): TriggerDriver {
  const trigger = capabilityV2(definition.trigger.capabilityId);
  if (!trigger || trigger.role !== "trigger") return "UNSUPPORTED";
  if (definition.trigger.capabilityId === "trigger.manual") return "CANMYPHONE_MANUAL";
  if (trigger.integration || trigger.executionModes.includes("THIRD_PARTY_API")) return "PROVIDER";
  if (trigger.executionModes.includes("PERSONAL_AUTOMATION")) return "APPLE_SHORTCUTS_BRIDGE";
  return "UNSUPPORTED";
}

function actionDriver(capabilityId: string): ActionDriver {
  const cap = capabilityV2(capabilityId);
  if (!cap || cap.role !== "action") return "UNSUPPORTED";
  if (capabilityId === "system.brightness.set") return "CANMYPHONE_NATIVE";
  if (cap.integration) return "PROVIDER";
  if (cap.executionModes.includes("SHORTCUT") || cap.executionModes.includes("PERSONAL_AUTOMATION")) return "APPLE_SHORTCUTS_ACTION";
  if (cap.executionModes.includes("APP_INTENT")) return "CANMYPHONE_APP_INTENT";
  if (cap.fallback === "GUIDED_HANDOFF") return "GUIDED";
  return "UNSUPPORTED";
}

export function compileAutomationRuntime(definition: ShortcutDefinition): AutomationRuntimePlan {
  const trigger = triggerDriver(definition);
  const actions = definition.actions.map((action) => actionDriver(action.capabilityId));
  const hasAppleActions = actions.includes("APPLE_SHORTCUTS_ACTION");
  const bridgeForTrigger = trigger === "APPLE_SHORTCUTS_BRIDGE";
  const appleBridgeRequired = bridgeForTrigger || hasAppleActions;
  const providerRequired = trigger === "PROVIDER" || actions.includes("PROVIDER");
  const canmyphoneOwnsAllActions = actions.every((driver) =>
    driver === "CANMYPHONE_NATIVE" || driver === "CANMYPHONE_APP_INTENT"
  );

  let appleBridgePurpose: AutomationRuntimePlan["appleBridgePurpose"] = "NONE";
  if (bridgeForTrigger && hasAppleActions) appleBridgePurpose = "TRIGGER_AND_ACTIONS";
  else if (bridgeForTrigger) appleBridgePurpose = "TRIGGER_ONLY";
  else if (hasAppleActions) appleBridgePurpose = "TRIGGER_AND_ACTIONS";

  let summary = "CanMyPhone kann diese Automation selbst ausführen.";
  if (appleBridgePurpose === "TRIGGER_ONLY") {
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
    summary
  };
}
