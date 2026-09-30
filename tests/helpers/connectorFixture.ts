import { ProviderConnectorRegistry, type ProviderConnectorManifest } from "../../src/automation/providerConnectorRegistry";
import { universalCapability } from "../../supabase/functions/_shared/universal-capabilities";
export function readyManifest(id = "example", operations = ["light.brightness.set"]): ProviderConnectorManifest {
  const source = `https://developer.${id}.example/api`;
  const m = new ProviderConnectorRegistry().discover(id, id);
  return { ...m, lifecycle: "READY", connectorVersion: 2, commercialUseStatus: "ALLOWED", transport: "CLOUD_REST", backgroundCapability: "SERVER",
    allowedDomains: [`api.${id}.example`],
    documentationSources: [{ url: source, kind: "OFFICIAL_DOCS", providerOwned: true, retrievedAt: "2026-09-26T00:00:00Z", verifiedAt: "2026-09-26T00:00:00Z" }],
    actions: operations.map(capabilityId => { const cap = universalCapability(capabilityId)!; return {
      capabilityId, inputSchema: cap.parameters, resultSchema: { ok: "boolean" as const, confirmed: "boolean" as const, providerId: "string" as const },
      risk: cap.risk.toUpperCase() as "LOW" | "MEDIUM" | "HIGH", confirmationRequired: cap.risk === "high", sourceUrls: [source]
    }; }),
    verification: { documentation: true, authentication: true, endpointAllowlist: true, inputSchema: true, outputSchema: true, riskClassification: true, terms: true, connectorTests: true }
  };
}
