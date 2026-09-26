/** Declarative connector metadata. A manifest never contains executable code or arbitrary request URLs. */
export type ConnectorLifecycle = "DISCOVERED" | "CANDIDATE" | "CANDIDATE_LEGAL_REVIEW_REQUIRED" | "VALIDATING" | "VERIFIED" | "READY" | "DEPRECATED" | "BLOCKED";
export type CommercialUseStatus = "ALLOWED" | "PARTNER_APPROVAL_REQUIRED" | "PERSONAL_USE_ONLY" | "UNKNOWN" | "BLOCKED";
export type ConnectorKind = "ECOSYSTEM" | "DIRECT" | "DYNAMIC";
export type DocumentationSource = { url: string; kind: "OFFICIAL_DOCS" | "OFFICIAL_OPENAPI" | "OFFICIAL_SDK" | "OFFICIAL_GITHUB" | "OFFICIAL_MANIFEST" | "COMMUNITY_HINT"; verifiedAt?: string };
export type VerificationGates = {
  documentation: boolean; authentication: boolean; endpointAllowlist: boolean;
  inputSchema: boolean; outputSchema: boolean; riskClassification: boolean;
  terms: boolean; connectorTests: boolean;
};
export type ConnectorOperation = {
  capabilityId: string;
  inputSchema: Record<string, "string" | "number" | "boolean">;
  resultSchema: Record<string, "string" | "number" | "boolean">;
  risk: "LOW" | "MEDIUM" | "HIGH";
  confirmationRequired: boolean;
};
export type ProviderConnectorManifest = {
  providerId: string; displayName: string; kind: ConnectorKind; category: string;
  ecosystem?: string; deviceTypes: string[]; transport: string;
  authentication: string; discovery: string; triggers: string[]; conditions: string[];
  actions: ConnectorOperation[]; eventSchemas: Record<string, unknown>;
  allowedDomains: string[]; localNetworkRequired: boolean;
  backgroundCapability: "NATIVE" | "SERVER" | "FOREGROUND_ONLY" | "NONE";
  rateLimits?: string; regionAvailability?: string[];
  commercialUseStatus: CommercialUseStatus; apiVersion: string;
  documentationSources: DocumentationSource[]; lastVerifiedAt?: string;
  connectorVersion: number; lifecycle: ConnectorLifecycle;
  verification: VerificationGates; confidence?: number;
};

const gates = (): VerificationGates => ({ documentation: false, authentication: false, endpointAllowlist: false, inputSchema: false, outputSchema: false, riskClassification: false, terms: false, connectorTests: false });
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function canPromoteConnector(manifest: ProviderConnectorManifest, trustedAdapterIds: ReadonlySet<string>): boolean {
  return manifest.commercialUseStatus === "ALLOWED" &&
    manifest.documentationSources.some(source => source.kind !== "COMMUNITY_HINT" && Boolean(source.verifiedAt) && /^https:\/\//.test(source.url)) &&
    manifest.actions.length > 0 && manifest.actions.every(action => Boolean(action.capabilityId) && Boolean(action.inputSchema) && Boolean(action.resultSchema)) &&
    (manifest.localNetworkRequired || manifest.transport === "HOMEKIT" || manifest.transport === "MATTER" || manifest.allowedDomains.length > 0) &&
    Object.values(manifest.verification).every(Boolean) &&
    trustedAdapterIds.has(manifest.providerId) &&
    manifest.allowedDomains.every(domain => /^[a-z0-9.-]+$/.test(domain) && !domain.startsWith(".") && !domain.endsWith("."));
}

function validShape(schema: Record<string, unknown>): boolean {
  return Object.values(schema).every(type => ["string", "number", "boolean"].includes(String(type)));
}

export function validateConnectorManifest(value: unknown): value is ProviderConnectorManifest {
  if (!value || typeof value !== "object") return false;
  const m = value as Partial<ProviderConnectorManifest>;
  return typeof m.providerId === "string" && idPattern.test(m.providerId) &&
    typeof m.displayName === "string" && m.displayName.length > 0 &&
    ["ECOSYSTEM", "DIRECT", "DYNAMIC"].includes(String(m.kind)) &&
    typeof m.category === "string" && Array.isArray(m.deviceTypes) && m.deviceTypes.every(x => typeof x === "string") &&
    typeof m.transport === "string" && typeof m.authentication === "string" && typeof m.discovery === "string" &&
    Array.isArray(m.triggers) && m.triggers.every(x => typeof x === "string") &&
    Array.isArray(m.conditions) && m.conditions.every(x => typeof x === "string") &&
    Array.isArray(m.actions) && m.actions.every(x => x && typeof x.capabilityId === "string" &&
      x.inputSchema && typeof x.inputSchema === "object" && !Array.isArray(x.inputSchema) && validShape(x.inputSchema) &&
      x.resultSchema && typeof x.resultSchema === "object" && !Array.isArray(x.resultSchema) && validShape(x.resultSchema) &&
      ["LOW", "MEDIUM", "HIGH"].includes(x.risk) && typeof x.confirmationRequired === "boolean") &&
    Boolean(m.eventSchemas && typeof m.eventSchemas === "object") &&
    Array.isArray(m.allowedDomains) && m.allowedDomains.every(x => typeof x === "string" && /^[a-z0-9.-]+$/.test(x)) &&
    typeof m.localNetworkRequired === "boolean" && ["NATIVE", "SERVER", "FOREGROUND_ONLY", "NONE"].includes(String(m.backgroundCapability)) &&
    ["ALLOWED", "PARTNER_APPROVAL_REQUIRED", "PERSONAL_USE_ONLY", "UNKNOWN", "BLOCKED"].includes(String(m.commercialUseStatus)) &&
    typeof m.apiVersion === "string" && Array.isArray(m.documentationSources) &&
    m.documentationSources.every(x => x && typeof x.url === "string" && ["OFFICIAL_DOCS", "OFFICIAL_OPENAPI", "OFFICIAL_SDK", "OFFICIAL_GITHUB", "OFFICIAL_MANIFEST", "COMMUNITY_HINT"].includes(x.kind)) &&
    Number.isInteger(m.connectorVersion) && (m.connectorVersion ?? 0) > 0 &&
    ["DISCOVERED", "CANDIDATE", "CANDIDATE_LEGAL_REVIEW_REQUIRED", "VALIDATING", "VERIFIED", "READY", "DEPRECATED", "BLOCKED"].includes(String(m.lifecycle)) &&
    Boolean(m.verification && Object.values(m.verification).length === 8 && Object.values(m.verification).every(x => typeof x === "boolean"));
}

export class ProviderConnectorRegistry {
  private readonly manifests = new Map<string, ProviderConnectorManifest>();
  constructor(manifests: ProviderConnectorManifest[] = [], private readonly trustedAdapterIds: ReadonlySet<string> = new Set()) {
    for (const manifest of manifests) this.upsert(manifest);
  }
  get(providerId: string): ProviderConnectorManifest | undefined { const item = this.manifests.get(providerId); return item && structuredClone(item); }
  list(): ProviderConnectorManifest[] { return [...this.manifests.values()].map(item => structuredClone(item)); }
  upsert(manifest: ProviderConnectorManifest): void {
    if (!validateConnectorManifest(manifest)) throw new Error("INVALID_CONNECTOR_MANIFEST");
    const old = this.manifests.get(manifest.providerId);
    if (old && manifest.connectorVersion <= old.connectorVersion) throw new Error("CONNECTOR_VERSION_NOT_NEWER");
    if (manifest.lifecycle === "READY" && !canPromoteConnector(manifest, this.trustedAdapterIds)) throw new Error("CONNECTOR_NOT_VERIFIED");
    this.manifests.set(manifest.providerId, structuredClone(manifest));
  }
  discover(providerId: string, displayName: string): ProviderConnectorManifest {
    if (!idPattern.test(providerId)) throw new Error("INVALID_PROVIDER_ID");
    const old = this.get(providerId);
    if (old) return old;
    const manifest: ProviderConnectorManifest = {
      providerId, displayName, kind: "DYNAMIC", category: "unknown", deviceTypes: [], transport: "UNKNOWN",
      authentication: "UNKNOWN", discovery: "OFFICIAL_SOURCE_REQUIRED", triggers: [], conditions: [], actions: [],
      eventSchemas: {}, allowedDomains: [], localNetworkRequired: false, backgroundCapability: "NONE",
      commercialUseStatus: "UNKNOWN", apiVersion: "unknown", documentationSources: [], connectorVersion: 1,
      lifecycle: "CANDIDATE_LEGAL_REVIEW_REQUIRED", verification: gates()
    };
    this.upsert(manifest);
    return manifest;
  }
  executable(providerId: string, capabilityId: string): boolean {
    const manifest = this.get(providerId);
    return Boolean(manifest && manifest.lifecycle === "READY" && canPromoteConnector(manifest, this.trustedAdapterIds) &&
      manifest.actions.some(action => action.capabilityId === capabilityId));
  }

  validateExecution(providerId: string, capabilityId: string, parameters: Record<string, unknown>): boolean {
    if (!this.executable(providerId, capabilityId)) return false;
    const operation = this.get(providerId)?.actions.find(action => action.capabilityId === capabilityId);
    if (!operation) return false;
    return Object.keys(parameters).every(key => Object.prototype.hasOwnProperty.call(operation.inputSchema, key)) &&
      Object.entries(operation.inputSchema).every(([key, type]) => typeof parameters[key] === type);
  }

  confirmationRequired(providerId: string, capabilityId: string): boolean {
    const action = this.get(providerId)?.actions.find(item => item.capabilityId === capabilityId);
    return Boolean(action?.confirmationRequired || action?.risk === "HIGH");
  }
}

export type DiscoveredDevice = { providerId: string; deviceId: string; capabilities: string[]; observedAt: string };
export function deviceSupportsOperation(device: DiscoveredDevice, capabilityId: string): boolean {
  return device.capabilities.includes(capabilityId);
}
