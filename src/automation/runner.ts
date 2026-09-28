import { capabilityV2 } from "./capabilityCatalogV2";
import { actionExecutionMode, hasValidSafetyApproval, validateStoredAutomation, type AutomationExecutionResult, type StoredAutomation } from "./materialization";
import { validateShortcutDefinition } from "./shortcutValidation";
import { connectorRequirementForStep } from "./connectorPlanning";
import type { ConnectorRuntime } from "./connectorRuntime";
import { connectorRegistry } from "./builtinConnectorManifests";
import type { ConnectorRegistry } from "./providerConnectorRegistry";

export type RunnerContext = {
  pro: boolean;
  grantedPermissions: Set<string>;
  connectedIntegrations: Set<string>;
  connectorRuntime?: ConnectorRuntime;
  registry?: ConnectorRegistry;
};
export type ActionExecutor = (capabilityId: string, parameters: Record<string, string | number | boolean>) => Promise<boolean>;

const result = (automationId: string, status: AutomationExecutionResult["status"], humanMessage: string, extra: Partial<AutomationExecutionResult> = {}): AutomationExecutionResult => ({ automationId, status, humanMessage, executedSteps: [], timestamp: new Date().toISOString(), ...extra });

export async function runStoredAutomation(item: StoredAutomation, context: RunnerContext, execute: ActionExecutor): Promise<AutomationExecutionResult> {
  if (!validateStoredAutomation(item) || !validateShortcutDefinition(item.definition).ok) return result(item?.id ?? "unknown", "INVALID_DEFINITION", "Diese Automation ist ungültig oder veraltet.", { errorCode: "INVALID_DEFINITION" });
  if (item.installationPlan?.installationHost === "HOMEKIT" || ["trigger.homekit-characteristic","trigger.homekit-time"].includes(item.definition.trigger.capabilityId)) return result(item.id, "UNSUPPORTED_ACTION", "Diese Automation wird ausschließlich von Apple Home ausgeführt.", { errorCode: "HOMEKIT_OWNS_EXECUTION" });
  if (!item.enabled) return result(item.id, "FAILED", "Diese Automation ist deaktiviert.", { errorCode: "AUTOMATION_DISABLED" });
  if (item.requiresPro && !context.pro) return result(item.id, "BLOCKED_ENTITLEMENT", "CanMyPhone Pro ist für diese Automation erforderlich.", { errorCode: "PRO_REQUIRED" });
  if (!hasValidSafetyApproval(item)) return result(item.id, "FAILED", "Diese konkrete Version der sensiblen Automation muss zuerst bestätigt werden.", { errorCode: "CONFIRMATION_REQUIRED" });
  const missingPermission = item.requiredSetup.find(x => !item.integrations.includes(x) && !context.grantedPermissions.has(x));
  if (missingPermission) return result(item.id, "BLOCKED_PERMISSION", "Eine benötigte Berechtigung fehlt.", { errorCode: "PERMISSION_REQUIRED" });
  const missingIntegration = item.integrations.find(x => !context.connectedIntegrations.has(x));
  if (missingIntegration) return result(item.id, "BLOCKED_INTEGRATION", "Ein benötigter Dienst ist nicht verbunden.", { errorCode: "INTEGRATION_REQUIRED" });

  const executedSteps: string[] = []; let failedStep: string | undefined;
  for (const step of item.definition.actions) {
    const registry = context.registry ?? context.connectorRuntime?.registry ?? connectorRegistry;
    const connector = connectorRequirementForStep(step, context.connectedIntegrations, registry);
    if (connector && connector.binding.status !== "BOUND") {
      return result(item.id, "BLOCKED_INTEGRATION", connector.binding.status === "DISCOVERY_REQUIRED" ? "Neue Verbindung wird geprüft." : "Der benötigte Connector oder die Gerätefähigkeit ist nicht verfügbar.", { executedSteps, failedStep: step.capabilityId, errorCode: connector.binding.status });
    }
    const cap = capabilityV2(step.capabilityId);
    const mode = actionExecutionMode(step);

    if (!cap || !cap.publicApi || mode === "UNSUPPORTED" || mode === "GUIDED_ONLY") {
      return result(item.id, "UNSUPPORTED_ACTION", "Mindestens eine Aktion kann nicht sicher ausgeführt werden.", { executedSteps, failedStep: step.capabilityId, errorCode: "ACTION_NOT_EXECUTABLE" });
    }

    if (mode === "REQUIRES_SHORTCUT_ACTION") {
      return result(item.id, "UNSUPPORTED_ACTION", "Diese Aktion muss noch über Apples System-Orchestrierung ausgeführt werden.", { executedSteps, failedStep: step.capabilityId, errorCode: "SHORTCUT_ACTION_REQUIRED" });
    }

    if (mode === "REQUIRES_PROVIDER") {
      const requirement = connectorRequirementForStep(step, context.connectedIntegrations, context.registry ?? context.connectorRuntime?.registry ?? connectorRegistry);
      if (!requirement) {
        return result(item.id, "UNSUPPORTED_ACTION", "Für diese Herstelleraktion ist noch kein sicherer Connector definiert.", { executedSteps, failedStep: step.capabilityId, errorCode: "CONNECTOR_ROUTE_MISSING" });
      }

      const binding = requirement.binding;
      if (binding.status === "DISCOVERY_REQUIRED" || binding.status === "DEVICE_CAPABILITY_MISMATCH") {
        return result(item.id, "BLOCKED_INTEGRATION", binding.status === "DISCOVERY_REQUIRED" ? "Neue Verbindung wird geprüft. Die Integration ist noch nicht freigegeben." : "Das ausgewählte Gerät besitzt die benötigte Fähigkeit nicht.", { executedSteps, failedStep: step.capabilityId, errorCode: binding.status });
      }
      if (binding.status === "CONNECTION_REQUIRED") {
        return result(item.id, "BLOCKED_INTEGRATION", `${binding.provider.displayName} muss zuerst verbunden werden.`, { executedSteps, failedStep: step.capabilityId, errorCode: "CONNECTOR_CONNECTION_REQUIRED" });
      }
      if (binding.status === "NOT_IMPLEMENTED") {
        return result(item.id, "UNSUPPORTED_ACTION", `Der ${binding.provider.displayName}-Connector ist noch nicht ausführbar.`, { executedSteps, failedStep: step.capabilityId, errorCode: "CONNECTOR_NOT_IMPLEMENTED" });
      }
      if (binding.status === "AMBIGUOUS") {
        return result(item.id, "BLOCKED_INTEGRATION", "Für diese Aktion muss zuerst ein konkreter Anbieter ausgewählt werden.", { executedSteps, failedStep: step.capabilityId, errorCode: "CONNECTOR_AMBIGUOUS" });
      }
      if (binding.status === "UNSUPPORTED") {
        return result(item.id, "UNSUPPORTED_ACTION", "Für diesen Hersteller gibt es noch keinen verifizierten Ausführungsweg.", { executedSteps, failedStep: step.capabilityId, errorCode: "CONNECTOR_UNSUPPORTED" });
      }
      if (!context.connectorRuntime) {
        return result(item.id, "UNSUPPORTED_ACTION", "Der Connector-Laufzeitdienst ist noch nicht verfügbar.", { executedSteps, failedStep: step.capabilityId, errorCode: "CONNECTOR_RUNTIME_UNAVAILABLE" });
      }

      const providerResult = await context.connectorRuntime.execute({
        automationId: item.id,
        providerId: binding.provider.id,
        capabilityId: step.capabilityId,
        parameters: step.parameters
      }, item);

      if (providerResult.ok) {
        executedSteps.push(step.capabilityId);
        continue;
      }

      failedStep = step.capabilityId;
      if (item.failurePolicy === "STOP") {
        return result(item.id, "FAILED", providerResult.message, { executedSteps, failedStep, errorCode: providerResult.code });
      }
      continue;
    }

    const ok = await execute(step.capabilityId, step.parameters);
    if (ok) { executedSteps.push(step.capabilityId); continue; }
    failedStep = step.capabilityId;
    if (item.failurePolicy === "STOP") return result(item.id, "FAILED", "Eine Aktion ist fehlgeschlagen; die Ausführung wurde gestoppt.", { executedSteps, failedStep, errorCode: "ACTION_FAILED" });
  }
  if (failedStep) return result(item.id, executedSteps.length ? "PARTIAL_SUCCESS" : "FAILED", "Nicht alle Aktionen konnten ausgeführt werden.", { executedSteps, failedStep, errorCode: "ACTION_FAILED" });
  return result(item.id, "SUCCESS", "Alle Aktionen wurden erfolgreich ausgeführt.", { executedSteps });
}
