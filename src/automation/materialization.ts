import { capabilityV2 } from "./capabilityCatalogV2";
import type { ShortcutDefinition, ShortcutStep } from "./shortcutCompiler";
import { validateShortcutDefinition } from "./shortcutValidation";

export const STORED_AUTOMATION_SCHEMA_VERSION = 1 as const;

export type MaterializationState = "DRAFT" | "READY_TO_INSTALL" | "APPLE_SETUP_REQUIRED" | "INSTALLED" | "ACTIVE" | "DISABLED" | "BROKEN" | "PERMISSION_REQUIRED" | "INTEGRATION_REQUIRED";
export type SetupState = "NOT_STARTED" | "HANDED_OFF" | "AWAITING_CONFIRMATION" | "USER_CONFIRMED" | "ACTIVE" | "UNKNOWN";
export type ActionExecutionMode = "EXECUTABLE_DIRECT" | "EXECUTABLE_APP_INTENT" | "REQUIRES_SHORTCUT_ACTION" | "REQUIRES_APPLE_AUTOMATION" | "REQUIRES_PROVIDER" | "GUIDED_ONLY" | "UNSUPPORTED";
export type FailurePolicy = "STOP" | "CONTINUE" | "BEST_EFFORT";
export type ExecutionStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED" | "BLOCKED_PERMISSION" | "BLOCKED_ENTITLEMENT" | "BLOCKED_INTEGRATION" | "INVALID_DEFINITION" | "UNSUPPORTED_ACTION";

export type PersonalAutomationSetup = {
  appleTriggerType: string;
  triggerParameters: Record<string, string | number | boolean>;
  runnerIntentName: "CanMyPhone Automation ausführen";
  automationId: string;
  setupSteps: string[];
  estimatedUserActions: number;
  setupState: SetupState;
  handedOffAt?: string;
};

export type StoredAutomation = {
  id: string;
  name: string;
  version: typeof STORED_AUTOMATION_SCHEMA_VERSION;
  originalIntentSummary: string;
  definition: ShortcutDefinition;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRunStatus?: ExecutionStatus;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  executionCount: number;
  requiresPro: boolean;
  riskLevel: "low" | "medium" | "high";
  confirmationRequired: boolean;
  requiredSetup: string[];
  integrations: string[];
  materializationState: MaterializationState;
  personalSetup?: PersonalAutomationSetup;
  failurePolicy: FailurePolicy;
};

export type AutomationExecutionResult = {
  automationId: string;
  status: ExecutionStatus;
  executedSteps: string[];
  failedStep?: string;
  errorCode?: string;
  humanMessage: string;
  timestamp: string;
};

const triggerNames: Record<string, string> = {
  "trigger.bluetooth-connected": "Bluetooth → Gerät verbunden",
  "trigger.bluetooth-disconnected": "Bluetooth → Gerät getrennt",
  "trigger.app-opened": "App → geöffnet",
  "trigger.battery-level": "Batteriestand",
  "trigger.weekday": "Tageszeit → werktags",
  "trigger.time": "Tageszeit",
  "trigger.location-enter": "Ankunft",
  "trigger.location-exit": "Verlassen",
  "trigger.charger-connected": "Ladegerät verbunden",
  "trigger.charger-disconnected": "Ladegerät getrennt",
  "trigger.nfc": "NFC",
  "trigger.focus-changed": "Fokus geändert"
};

export function actionExecutionMode(step: ShortcutStep): ActionExecutionMode {
  const cap = capabilityV2(step.capabilityId);
  if (!cap || cap.role !== "action") return "UNSUPPORTED";
  if (step.capabilityId === "system.brightness.set") return "EXECUTABLE_DIRECT";
  if (cap.integration) return "REQUIRES_PROVIDER";
  if (cap.executionModes.includes("SHORTCUT") || cap.executionModes.includes("PERSONAL_AUTOMATION")) return "REQUIRES_SHORTCUT_ACTION";
  if (cap.executionModes.includes("APP_INTENT")) return "EXECUTABLE_APP_INTENT";
  if (cap.fallback === "GUIDED_HANDOFF") return "GUIDED_ONLY";
  return "UNSUPPORTED";
}

export function materializeShortcutDefinition(definition: ShortcutDefinition, now = new Date()): StoredAutomation {
  const checked = validateShortcutDefinition(definition);
  if (!checked.ok) throw new Error(`INVALID_DEFINITION:${checked.errors.join("|")}`);
  if (definition.clarification) throw new Error("CLARIFICATION_REQUIRED");
  const stamp = now.toISOString();
  const id = `cmp_auto_${Math.random().toString(36).slice(2, 10)}`;
  const requiresPro = definition.variables.entitlement === "pro";
  const triggerIsPersonal = definition.trigger.capabilityId !== "trigger.manual";
  const modes = definition.actions.map(actionExecutionMode);
  let materializationState: MaterializationState = "READY_TO_INSTALL";
  if (definition.integrations.length) materializationState = "INTEGRATION_REQUIRED";
  else if (definition.requiredSetup.length) materializationState = "PERMISSION_REQUIRED";
  else if (triggerIsPersonal) materializationState = "APPLE_SETUP_REQUIRED";

  const personalSetup = triggerIsPersonal ? createPersonalAutomationSetup(id, definition.trigger, definition.actions) : undefined;
  return {
    id, name: definition.name, version: STORED_AUTOMATION_SCHEMA_VERSION,
    originalIntentSummary: definition.name.slice(0, 120), definition, enabled: false,
    createdAt: stamp, updatedAt: stamp, executionCount: 0, requiresPro,
    riskLevel: definition.risk, confirmationRequired: definition.confirmationRequired,
    requiredSetup: [...definition.requiredSetup], integrations: [...definition.integrations],
    materializationState, personalSetup,
    failurePolicy: definition.risk === "high" ? "STOP" : (modes.length > 1 ? "BEST_EFFORT" : "STOP")
  };
}

export function createPersonalAutomationSetup(automationId: string, trigger: ShortcutStep, actions: ShortcutStep[] = []): PersonalAutomationSetup {
  const triggerLabel = triggerNames[trigger.capabilityId] ?? "Persönliche Automation";
  const value = Object.values(trigger.parameters)[0];
  const selector = value === undefined ? triggerLabel : `${triggerLabel}: ${String(value)}`;
  const shortcutActions = actions.filter(action => actionExecutionMode(action) === "REQUIRES_SHORTCUT_ACTION");
  const runnerActions = actions.filter(action => actionExecutionMode(action) === "EXECUTABLE_DIRECT" || actionExecutionMode(action) === "EXECUTABLE_APP_INTENT");
  const actionSteps = [
    ...(runnerActions.length ? [`Die Aktion „CanMyPhone Automation ausführen“ hinzufügen und „${automationId}“ einsetzen.`] : []),
    ...shortcutActions.map(action => `Apples Aktion „${capabilityV2(action.capabilityId)?.description ?? action.capabilityId}“ hinzufügen.`)
  ];
  return {
    appleTriggerType: trigger.capabilityId,
    triggerParameters: { ...trigger.parameters },
    runnerIntentName: "CanMyPhone Automation ausführen",
    automationId,
    setupSteps: [
      `In Kurzbefehle „Automation“ und anschließend „Neue Automation“ wählen.`,
      `${selector} als Auslöser auswählen.`,
      ...actionSteps,
      "Apples Zusammenfassung prüfen und die Automation sichern."
    ],
    estimatedUserActions: 3 + actionSteps.length,
    setupState: "NOT_STARTED"
  };
}

export function validateStoredAutomation(value: unknown): value is StoredAutomation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StoredAutomation>;
  return item.version === STORED_AUTOMATION_SCHEMA_VERSION && typeof item.id === "string" && item.id.startsWith("cmp_auto_") &&
    typeof item.enabled === "boolean" && Boolean(item.definition) && validateShortcutDefinition(item.definition).ok;
}
