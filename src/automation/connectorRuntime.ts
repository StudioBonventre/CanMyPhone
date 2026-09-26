export type ConnectorExecutionRequest = {
  automationId: string;
  providerId: string;
  capabilityId: string;
  parameters: Record<string, string | number | boolean>;
};

export type ConnectorExecutionResult =
  | { ok: true; confirmed: true; providerId: string; message?: string }
  | { ok: false; providerId: string; code: string; message: string };

export type ConnectorAdapter = {
  providerId: string;
  execute(request: ConnectorExecutionRequest): Promise<ConnectorExecutionResult>;
};

export class ConnectorRuntime {
  private readonly adapters = new Map<string, ConnectorAdapter>();
  private static readonly legacyTrustedAdapters = new Set(["tesla", "homematic-ip"]);

  constructor(
    adapters: ConnectorAdapter[] = [],
    private readonly registry?: ProviderConnectorRegistry,
    private readonly verifySensitiveApproval?: (request: ConnectorExecutionRequest) => boolean
  ) {
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter: ConnectorAdapter): void {
    if (!this.registry && !ConnectorRuntime.legacyTrustedAdapters.has(adapter.providerId)) {
      throw new Error("CONNECTOR_MANIFEST_REQUIRED");
    }
    this.adapters.set(adapter.providerId, adapter);
  }

  has(providerId: string): boolean {
    return this.adapters.has(providerId);
  }

  async execute(request: ConnectorExecutionRequest): Promise<ConnectorExecutionResult> {
    if (this.registry && !this.registry.validateExecution(request.providerId, request.capabilityId, request.parameters)) {
      return { ok: false, providerId: request.providerId, code: "CONNECTOR_NOT_READY", message: "Connector oder Operation ist nicht freigegeben." };
    }
    if (this.registry?.confirmationRequired(request.providerId, request.capabilityId) && !this.verifySensitiveApproval?.(request)) {
      return { ok: false, providerId: request.providerId, code: "CONFIRMATION_REQUIRED", message: "Diese Aktion benötigt eine gültige Bestätigung." };
    }
    const adapter = this.adapters.get(request.providerId);
    if (!adapter) {
      return {
        ok: false,
        providerId: request.providerId,
        code: "CONNECTOR_ADAPTER_MISSING",
        message: "Für diesen Anbieter ist noch kein ausführbarer Connector geladen."
      };
    }
    return adapter.execute(request);
  }
}
import { ProviderConnectorRegistry } from "./providerConnectorRegistry";
