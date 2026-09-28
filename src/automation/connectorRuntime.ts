import { connectorRegistry } from "./builtinConnectorManifests";
import { validateSchemaValue, type ConnectorRegistry } from "./providerConnectorRegistry";
import { normalizeConnectorStep } from "../../supabase/functions/_shared/universal-capabilities";
import { hasValidSafetyApproval, type StoredAutomation } from "./materialization";
export type ConnectorExecutionRequest = { automationId: string; providerId: string; capabilityId: string; parameters: Record<string, string | number | boolean> };
export type ConnectorExecutionResult =
  | { ok: true; confirmed: true; providerId: string; message?: string }
  | { ok: false; providerId: string; code: string; message: string };
export type ConnectorAdapter = { providerId: string; execute(request: ConnectorExecutionRequest): Promise<ConnectorExecutionResult> };
export class ConnectorRuntime {
  private readonly adapters = new Map<string, ConnectorAdapter>();
  constructor(adapters: ConnectorAdapter[] = [], readonly registry: ConnectorRegistry = connectorRegistry,
    private readonly verifySensitiveApproval?: (request: ConnectorExecutionRequest) => boolean) {
    for (const adapter of adapters) this.register(adapter);
  }
  register(adapter: ConnectorAdapter): void {
    if (!this.registry.getProvider(adapter.providerId)) throw new Error("CONNECTOR_MANIFEST_REQUIRED");
    this.adapters.set(adapter.providerId, adapter);
  }
  has(providerId: string): boolean { return this.adapters.has(providerId) && this.registry.listReadyProviders().some(m => m.providerId === providerId); }
  async execute(request: ConnectorExecutionRequest, approvedAutomation?: StoredAutomation): Promise<ConnectorExecutionResult> {
    const fail = (code: string, message: string): ConnectorExecutionResult => ({ ok: false, providerId: request.providerId, code, message });
    const normalized = normalizeConnectorStep(request);
    const snapshot = { ...request, ...normalized, parameters: { ...normalized.parameters } };
    if (!this.registry.validateExecution(snapshot.providerId, snapshot.capabilityId, snapshot.parameters)) return fail("CONNECTOR_NOT_READY", "Connector, Operation oder Parameter sind nicht freigegeben.");
    const device = typeof snapshot.parameters.device === "string" ? snapshot.parameters.device : undefined;
    const inventory = this.registry.getDevices();
    if (inventory.length && (device || snapshot.parameters.room)) {
      const resolved = this.registry.resolveCapability({ capabilityId: snapshot.capabilityId, deviceName: device,
        room: typeof snapshot.parameters.room === "string" ? snapshot.parameters.room : undefined, connectedProviderIds: new Set([snapshot.providerId]) });
      if (resolved.status !== "READY") return fail("DEVICE_CAPABILITY_MISMATCH", "Kein eindeutig erreichbares Gerät besitzt die benötigte Fähigkeit.");
    }
    const approved = approvedAutomation?.id === request.automationId && approvedAutomation.confirmationRequired && hasValidSafetyApproval(approvedAutomation) &&
      approvedAutomation.definition.actions.some(action => {
        const step = normalizeConnectorStep(action);
        return step.capabilityId === snapshot.capabilityId && JSON.stringify(Object.entries(step.parameters).sort()) === JSON.stringify(Object.entries(snapshot.parameters).sort());
      });
    if (this.registry.confirmationRequired(snapshot.providerId, snapshot.capabilityId) && !approved && !this.verifySensitiveApproval?.(snapshot)) return fail("CONFIRMATION_REQUIRED", "Diese konkrete Aktion benötigt eine gültige Bestätigung.");
    const adapter = this.adapters.get(snapshot.providerId);
    if (!adapter) return fail("CONNECTOR_ADAPTER_MISSING", "Für diesen Anbieter ist noch kein ausführbarer Connector geladen.");
    try {
      const result = await adapter.execute(snapshot);
      if (!result || result.providerId !== snapshot.providerId) return fail("INVALID_CONNECTOR_RESPONSE", "Der Anbieter hat kein gültiges Ergebnis geliefert.");
      if (!result.ok) return result;
      const operation = this.registry.getProvider(snapshot.providerId)?.actions.find(a => a.capabilityId === snapshot.capabilityId);
      if (!operation || result.confirmed !== true || !validateSchemaValue(operation.resultSchema, result)) return fail("INVALID_CONNECTOR_RESPONSE", "Die Ausführung wurde nicht gültig bestätigt.");
      return result;
    } catch { return fail("CONNECTOR_EXECUTION_FAILED", "Der Anbieter konnte die Ausführung nicht bestätigen."); }
  }
}
