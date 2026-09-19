import { capabilityV2 } from "./capabilityCatalogV2";
import { actionExecutionMode, validateStoredAutomation, type AutomationExecutionResult, type StoredAutomation } from "./materialization";
import { validateShortcutDefinition } from "./shortcutValidation";

export type RunnerContext = { pro: boolean; grantedPermissions: Set<string>; connectedIntegrations: Set<string>; confirmedSensitive: boolean };
export type ActionExecutor = (capabilityId: string, parameters: Record<string, string | number | boolean>) => Promise<boolean>;

const result = (automationId: string, status: AutomationExecutionResult["status"], humanMessage: string, extra: Partial<AutomationExecutionResult> = {}): AutomationExecutionResult => ({ automationId, status, humanMessage, executedSteps: [], timestamp: new Date().toISOString(), ...extra });

export async function runStoredAutomation(item: StoredAutomation, context: RunnerContext, execute: ActionExecutor): Promise<AutomationExecutionResult> {
  if (!validateStoredAutomation(item) || !validateShortcutDefinition(item.definition).ok) return result(item?.id ?? "unknown", "INVALID_DEFINITION", "Diese Automation ist ungültig oder veraltet.", { errorCode: "INVALID_DEFINITION" });
  if (!item.enabled) return result(item.id, "FAILED", "Diese Automation ist deaktiviert.", { errorCode: "AUTOMATION_DISABLED" });
  if (item.requiresPro && !context.pro) return result(item.id, "BLOCKED_ENTITLEMENT", "CanMyPhone Pro ist für diese Automation erforderlich.", { errorCode: "PRO_REQUIRED" });
  if (item.confirmationRequired && !context.confirmedSensitive) return result(item.id, "FAILED", "Diese sensible Automation muss zuerst bestätigt werden.", { errorCode: "CONFIRMATION_REQUIRED" });
  const missingPermission = item.requiredSetup.find(x => !item.integrations.includes(x) && !context.grantedPermissions.has(x));
  if (missingPermission) return result(item.id, "BLOCKED_PERMISSION", "Eine benötigte Berechtigung fehlt.", { errorCode: "PERMISSION_REQUIRED" });
  const missingIntegration = item.integrations.find(x => !context.connectedIntegrations.has(x));
  if (missingIntegration) return result(item.id, "BLOCKED_INTEGRATION", "Ein benötigter Dienst ist nicht verbunden.", { errorCode: "INTEGRATION_REQUIRED" });

  const executedSteps: string[] = []; let failedStep: string | undefined;
  for (const step of item.definition.actions) {
    const cap = capabilityV2(step.capabilityId); const mode = actionExecutionMode(step);
    if (!cap || !cap.publicApi || mode === "UNSUPPORTED" || mode === "GUIDED_ONLY" || mode === "REQUIRES_PROVIDER") return result(item.id, "UNSUPPORTED_ACTION", "Mindestens eine Aktion kann nicht sicher ausgeführt werden.", { executedSteps, failedStep: step.capabilityId, errorCode: "ACTION_NOT_EXECUTABLE" });
    if (mode === "REQUIRES_SHORTCUT_ACTION") return result(item.id, "UNSUPPORTED_ACTION", "Diese Aktion muss als Apple-Kurzbefehle-Aktion eingerichtet werden.", { executedSteps, failedStep: step.capabilityId, errorCode: "SHORTCUT_ACTION_REQUIRED" });
    const ok = await execute(step.capabilityId, step.parameters);
    if (ok) { executedSteps.push(step.capabilityId); continue; }
    failedStep = step.capabilityId;
    if (item.failurePolicy === "STOP") return result(item.id, "FAILED", "Eine Aktion ist fehlgeschlagen; die Ausführung wurde gestoppt.", { executedSteps, failedStep, errorCode: "ACTION_FAILED" });
  }
  if (failedStep) return result(item.id, executedSteps.length ? "PARTIAL_SUCCESS" : "FAILED", "Nicht alle Aktionen konnten ausgeführt werden.", { executedSteps, failedStep, errorCode: "ACTION_FAILED" });
  return result(item.id, "SUCCESS", "Alle Aktionen wurden erfolgreich ausgeführt.", { executedSteps });
}
