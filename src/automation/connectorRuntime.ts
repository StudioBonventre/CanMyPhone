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

  constructor(adapters: ConnectorAdapter[] = []) {
    for (const adapter of adapters) this.register(adapter);
  }

  register(adapter: ConnectorAdapter): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  has(providerId: string): boolean {
    return this.adapters.has(providerId);
  }

  async execute(request: ConnectorExecutionRequest): Promise<ConnectorExecutionResult> {
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
