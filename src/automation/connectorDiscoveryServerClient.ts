import type { ConnectorDiscoveryRequest, ConnectorDiscoveryResult } from "./connectorDiscovery";
import { validateDiscoveryResult } from "./connectorDiscovery";

export type ConnectorDiscoveryServerClientConfig = {
  supabaseUrl: string;
  publishableKey: string;
  getAccessToken: () => Promise<string | null>;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

export function createConnectorDiscoveryServerClient(config: ConnectorDiscoveryServerClientConfig) {
  return {
    async discover(request: ConnectorDiscoveryRequest): Promise<ConnectorDiscoveryResult | null> {
      const token = await config.getAccessToken();
      if (!token) return null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 32_000);
      try {
        const response = await (config.fetcher ?? fetch)(
          `${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/discover-connector`,
          {
            method: "POST",
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: config.publishableKey,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              providerName: request.providerName.slice(0, 160),
              providerHints: request.providerHints.slice(0, 20),
              requestedCapabilities: request.requestedCapabilities.slice(0, 20),
              deviceHints: request.deviceHints.slice(0, 20),
              locale: request.locale.slice(0, 10),
              ...(request.region ? { region: request.region.slice(0, 80) } : {}),
              ...(request.room ? { room: request.room.slice(0, 120) } : {})
            })
          }
        );
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok || !body || typeof body !== "object" || !(body as { ok?: unknown }).ok) return null;
        return validateDiscoveryResult(body) ? body : null;
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }
  };
}
