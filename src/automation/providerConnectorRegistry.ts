import { normalizeConnectorStep, universalCapability, type UniversalParameter } from "../../supabase/functions/_shared/universal-capabilities";
import { resolveExecutionPath, type ExecutionPathRequest, type ExecutionPathResolution } from "./capabilityResolver";

export type ConnectorLifecycle = "DISCOVERED" | "CANDIDATE" | "CANDIDATE_LEGAL_REVIEW_REQUIRED" | "VALIDATING" | "VERIFIED" | "READY" | "DEPRECATED" | "BLOCKED";
export type CommercialUseStatus = "ALLOWED" | "PARTNER_APPROVAL_REQUIRED" | "PERSONAL_USE_ONLY" | "UNKNOWN" | "BLOCKED";
export type ConnectorKind = "ECOSYSTEM" | "DIRECT" | "DYNAMIC";
export type DocumentationSource = { url: string; kind: "OFFICIAL_DOCS" | "OFFICIAL_OPENAPI" | "OFFICIAL_SDK" | "OFFICIAL_GITHUB" | "OFFICIAL_MANIFEST" | "COMMUNITY_HINT"; providerOwned?: boolean; retrievedAt?: string; verifiedAt?: string; apiVersion?: string };
export type VerificationGates = { documentation: boolean; authentication: boolean; endpointAllowlist: boolean; inputSchema: boolean; outputSchema: boolean; riskClassification: boolean; terms: boolean; connectorTests: boolean };
export type ConnectorSchema = Record<string, "string" | "number" | "boolean" | UniversalParameter>;
export type ConnectorOperation = { capabilityId: string; inputSchema: ConnectorSchema; resultSchema: ConnectorSchema; risk: "LOW" | "MEDIUM" | "HIGH"; confirmationRequired: boolean; sourceUrls?: string[]; adapterOperation?: string };
export type ProviderConnectorManifest = {
  providerId: string; displayName: string; kind: ConnectorKind; category: string;
  aliases?: string[]; ecosystem?: string; deviceTypes: string[]; transport: string;
  authentication: string; discovery: string; triggers: string[]; conditions: string[];
  actions: ConnectorOperation[]; eventSchemas: Record<string, ConnectorSchema>; capabilitySources?: Record<string, string[]>;
  allowedDomains: string[]; localNetworkRequired: boolean;
  backgroundCapability: "NATIVE" | "SERVER" | "FOREGROUND_ONLY" | "NONE";
  executionHost?: string; eventInstallationSupported?: boolean; rateLimits?: string; regionAvailability?: string[];
  commercialUseStatus: CommercialUseStatus; apiVersion: string; documentationSources: DocumentationSource[];
  lastVerifiedAt?: string; connectorVersion: number; lifecycle: ConnectorLifecycle; verification: VerificationGates; confidence?: number;
};
export type ProviderPath = { providerId: string; providerDeviceId: string; capabilities: string[]; online: boolean; observedAt: string; reliability?: number; latencyMs?: number; privacy?: number; background?: boolean; eventSupport?: boolean; credentialReady?: boolean };
export type DiscoveredDevice = { deviceId: string; providerId: string; capabilities: string[]; observedAt: string; name?: string; ecosystem?: string; deviceClass?: string; room?: string; online?: boolean; metadata?: Record<string, string | number | boolean>; paths?: ProviderPath[] };
export interface ConnectorRegistry {
  getProvider(id: string): ProviderConnectorManifest | undefined;
  list(): ProviderConnectorManifest[];
  findProvidersForCapability(id: string): ProviderConnectorManifest[];
  findProvidersForDevice(device: DiscoveredDevice): ProviderConnectorManifest[];
  registerCandidate(manifest: ProviderConnectorManifest): void;
  promoteCandidate(id: string, next: ProviderConnectorManifest): void;
  disableProvider(id: string): void;
  listReadyProviders(): ProviderConnectorManifest[];
  listDiscoveryCandidates(): ProviderConnectorManifest[];
  resolveCapability(request: ExecutionPathRequest): ExecutionPathResolution;
  executable(providerId: string, capabilityId: string): boolean;
  validateExecution(providerId: string, capabilityId: string, parameters: Record<string, unknown>): boolean;
  confirmationRequired(providerId: string, capabilityId: string): boolean;
  getDevices(): DiscoveredDevice[];
}
export const emptyVerification = (): VerificationGates => ({ documentation: false, authentication: false, endpointAllowlist: false, inputSchema: false, outputSchema: false, riskClassification: false, terms: false, connectorTests: false });
const object = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string" && x.length <= 2048);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const timestamp = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
function httpsURL(value: string): boolean { try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password && Boolean(url.hostname); } catch { return false; } }
function validSchema(schema: unknown): schema is ConnectorSchema {
  return object(schema) && Object.entries(schema).every(([key, value]) => !["__proto__", "constructor", "prototype"].includes(key) &&
    (typeof value === "string" ? ["string", "number", "boolean"].includes(value) : object(value) &&
      Object.keys(value).every(k => ["type", "required", "min", "max", "values"].includes(k)) &&
      ["string", "number", "boolean"].includes(String(value.type)) && typeof value.required === "boolean" &&
      (value.min === undefined || typeof value.min === "number" && Number.isFinite(value.min)) &&
      (value.max === undefined || typeof value.max === "number" && Number.isFinite(value.max)) &&
      (value.min === undefined || value.max === undefined || Number(value.min) <= Number(value.max)) &&
      (value.values === undefined || Array.isArray(value.values) && value.values.every(item => typeof item === value.type))));
}
export function validateSchemaValue(schema: ConnectorSchema, value: Record<string, unknown>): boolean {
  return object(value) && Object.keys(value).every(key => Object.prototype.hasOwnProperty.call(schema, key)) &&
    Object.entries(schema).every(([key, entry]) => {
      const rule: UniversalParameter = typeof entry === "string" ? { type: entry, required: true } : entry;
      const actual = value[key];
      if (actual === undefined) return !rule.required;
      if (typeof actual !== rule.type || typeof actual === "number" && !Number.isFinite(actual)) return false;
      if (typeof actual === "string" && actual.length > 2048) return false;
      if (typeof actual === "number" && ((rule.min !== undefined && actual < rule.min) || (rule.max !== undefined && actual > rule.max))) return false;
      return !rule.values || rule.values.includes(actual as never);
    });
}
export function validateConnectorManifest(value: unknown): value is ProviderConnectorManifest {
  if (!object(value) || JSON.stringify(value).length > 128_000) return false;
  const m = value as unknown as ProviderConnectorManifest;
  const allowed = ["providerId", "displayName", "kind", "category", "aliases", "ecosystem", "deviceTypes", "transport", "authentication", "discovery", "triggers", "conditions", "actions", "eventSchemas", "capabilitySources", "allowedDomains", "localNetworkRequired", "backgroundCapability", "executionHost", "eventInstallationSupported", "rateLimits", "regionAvailability", "commercialUseStatus", "apiVersion", "documentationSources", "lastVerifiedAt", "connectorVersion", "lifecycle", "verification", "confidence"];
  return Object.keys(value).every(key => allowed.includes(key)) && typeof m.providerId === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.providerId) && m.providerId.length <= 80 &&
    typeof m.displayName === "string" && m.displayName.length > 0 && m.displayName.length <= 160 &&
    ["ECOSYSTEM", "DIRECT", "DYNAMIC"].includes(m.kind) && typeof m.category === "string" &&
    strings(m.deviceTypes) && (m.aliases === undefined || strings(m.aliases)) &&
    typeof m.transport === "string" && typeof m.authentication === "string" && typeof m.discovery === "string" && strings(m.triggers) && strings(m.conditions) &&
    Array.isArray(m.actions) && m.actions.length <= 200 && new Set(m.actions.map(x => x?.capabilityId)).size === m.actions.length &&
    m.actions.every(x => object(x) && Object.keys(x).every(k => ["capabilityId", "inputSchema", "resultSchema", "risk", "confirmationRequired", "sourceUrls", "adapterOperation"].includes(k)) &&
      typeof x.capabilityId === "string" && validSchema(x.inputSchema) && validSchema(x.resultSchema) &&
      ["LOW", "MEDIUM", "HIGH"].includes(x.risk) && typeof x.confirmationRequired === "boolean" &&
      (x.sourceUrls === undefined || strings(x.sourceUrls)) && (x.adapterOperation === undefined || typeof x.adapterOperation === "string")) &&
    object(m.eventSchemas) && Object.values(m.eventSchemas).every(validSchema) &&
    (m.capabilitySources === undefined || object(m.capabilitySources) && Object.values(m.capabilitySources).every(strings)) &&
    strings(m.allowedDomains) && m.allowedDomains.every(x => /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(x)) &&
    typeof m.localNetworkRequired === "boolean" && ["NATIVE", "SERVER", "FOREGROUND_ONLY", "NONE"].includes(m.backgroundCapability) &&
    (m.eventInstallationSupported === undefined || typeof m.eventInstallationSupported === "boolean") &&
    (m.regionAvailability === undefined || strings(m.regionAvailability)) &&
    ["ALLOWED", "PARTNER_APPROVAL_REQUIRED", "PERSONAL_USE_ONLY", "UNKNOWN", "BLOCKED"].includes(m.commercialUseStatus) &&
    typeof m.apiVersion === "string" && Array.isArray(m.documentationSources) && m.documentationSources.every(x => object(x) &&
      Object.keys(x).every(k => ["url", "kind", "providerOwned", "retrievedAt", "verifiedAt", "apiVersion"].includes(k)) &&
      typeof x.url === "string" && httpsURL(x.url) && ["OFFICIAL_DOCS", "OFFICIAL_OPENAPI", "OFFICIAL_SDK", "OFFICIAL_GITHUB", "OFFICIAL_MANIFEST", "COMMUNITY_HINT"].includes(x.kind) &&
      (x.providerOwned === undefined || typeof x.providerOwned === "boolean") &&
      (x.retrievedAt === undefined || timestamp(x.retrievedAt)) && (x.verifiedAt === undefined || timestamp(x.verifiedAt))) &&
    Number.isInteger(m.connectorVersion) && m.connectorVersion > 0 &&
    ["DISCOVERED", "CANDIDATE", "CANDIDATE_LEGAL_REVIEW_REQUIRED", "VALIDATING", "VERIFIED", "READY", "DEPRECATED", "BLOCKED"].includes(m.lifecycle) &&
    object(m.verification) && Object.keys(m.verification).length === 8 && Object.keys(emptyVerification()).every(key => typeof m.verification[key as keyof VerificationGates] === "boolean") &&
    (m.lastVerifiedAt === undefined || timestamp(m.lastVerifiedAt)) &&
    (m.confidence === undefined || typeof m.confidence === "number" && Number.isFinite(m.confidence) && m.confidence >= 0 && m.confidence <= 1);
}
export function canPromoteConnector(m: ProviderConnectorManifest, trustedAdapterIds: ReadonlySet<string>): boolean {
  if (!validateConnectorManifest(m) || m.commercialUseStatus !== "ALLOWED" || !Object.values(m.verification).every(Boolean) || !trustedAdapterIds.has(m.providerId)) return false;
  const official = new Set(m.documentationSources.filter(s => s.providerOwned === true && s.kind !== "COMMUNITY_HINT" && timestamp(s.retrievedAt) && timestamp(s.verifiedAt)).map(s => s.url));
  const sourced = (sources?: string[]) => Boolean(sources?.length && sources.every(url => official.has(url)));
  const riskRank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  return official.size > 0 && (m.localNetworkRequired || ["HOMEKIT", "MATTER"].includes(m.transport) || m.allowedDomains.length > 0) &&
    m.actions.length + m.triggers.length > 0 && m.actions.every(a => sourced(a.sourceUrls) && universalCapability(a.capabilityId)?.role !== "trigger" &&
      riskRank[a.risk] >= riskRank[(universalCapability(a.capabilityId)?.risk ?? "low").toUpperCase() as keyof typeof riskRank] &&
      (a.risk !== "HIGH" || a.confirmationRequired)) &&
    [...m.triggers, ...m.conditions].every(id => sourced(m.capabilitySources?.[id]) && Boolean(m.eventSchemas[id]));
}
export class ProviderConnectorRegistry implements ConnectorRegistry {
  private readonly manifests = new Map<string, ProviderConnectorManifest>();
  private readonly expiries = new Map<string, number>();
  private devices: DiscoveredDevice[] = [];
  private revision = 0;
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getRevision = (): number => this.revision;
  private changed(): void { this.revision++; this.listeners.forEach(listener => listener()); }
  private readonly trustedAdapterIds: ReadonlySet<string>;
  private readonly releaseManifests: ReadonlyMap<string, string>;
  // Only local release code supplies this baseline. Cache/server data cannot declare themselves built-in.
  constructor(manifests: ProviderConnectorManifest[] = [], trustedAdapterIds: ReadonlySet<string> = new Set(), releaseManifests: readonly ProviderConnectorManifest[] = []) {
    this.trustedAdapterIds = new Set(trustedAdapterIds);
    this.releaseManifests = new Map(releaseManifests.map(m => [m.providerId, JSON.stringify(m)]));
    for (const m of manifests) this.upsert(m);
  }
  private eligible(m: ProviderConnectorManifest): boolean {
    return (this.expiries.get(m.providerId) ?? Infinity) > Date.now() && m.commercialUseStatus === "ALLOWED" && this.trustedAdapterIds.has(m.providerId) &&
      (this.releaseManifests.get(m.providerId) === JSON.stringify(m) || canPromoteConnector(m, this.trustedAdapterIds));
  }
  get(id: string): ProviderConnectorManifest | undefined { return this.getProvider(id); }
  setProviderExpiry(id: string, expiresAt: number): void { this.expiries.set(id, expiresAt); this.changed(); }
  providerExpiry(id: string): number | null { return this.expiries.get(id) ?? null; }
  getProvider(id: string): ProviderConnectorManifest | undefined { const m = this.manifests.get(id); return m && clone(m); }
  list(): ProviderConnectorManifest[] { return [...this.manifests.values()].map(clone); }
  upsert(m: ProviderConnectorManifest): void {
    if (!validateConnectorManifest(m)) throw new Error("INVALID_CONNECTOR_MANIFEST");
    const old = this.manifests.get(m.providerId);
    if (old && m.connectorVersion <= old.connectorVersion) throw new Error("CONNECTOR_VERSION_NOT_NEWER");
    if (m.lifecycle === "READY" && !this.eligible(m)) throw new Error("CONNECTOR_NOT_VERIFIED");
    this.manifests.set(m.providerId, clone(m));
    this.changed();
  }
  registerCandidate(m: ProviderConnectorManifest): void {
    if (!["DISCOVERED", "CANDIDATE", "CANDIDATE_LEGAL_REVIEW_REQUIRED"].includes(m.lifecycle)) throw new Error("CANDIDATE_STATUS_REQUIRED");
    this.upsert(m);
  }
  promoteCandidate(id: string, next: ProviderConnectorManifest): void {
    const old = this.getProvider(id);
    const transitions: Record<string, string[]> = { DISCOVERED: ["CANDIDATE"], CANDIDATE_LEGAL_REVIEW_REQUIRED: ["CANDIDATE"], CANDIDATE: ["VALIDATING"], VALIDATING: ["VERIFIED"], VERIFIED: ["READY"] };
    if (!old || id !== next.providerId || !transitions[old.lifecycle]?.includes(next.lifecycle)) throw new Error("INVALID_CONNECTOR_TRANSITION");
    if (["VERIFIED", "READY"].includes(next.lifecycle) && !this.eligible(next)) throw new Error("CONNECTOR_NOT_VERIFIED");
    this.upsert(next);
  }
  disableProvider(id: string): void { const m = this.getProvider(id); if (m) this.upsert({ ...m, connectorVersion: m.connectorVersion + 1, lifecycle: "BLOCKED" }); }
  listReadyProviders(): ProviderConnectorManifest[] { return this.list().filter(m => m.lifecycle === "READY" && this.eligible(m)); }
  listDiscoveryCandidates(): ProviderConnectorManifest[] { return this.list().filter(m => !["READY", "BLOCKED", "DEPRECATED"].includes(m.lifecycle)); }
  findProvidersForCapability(id: string): ProviderConnectorManifest[] {
    const canonical = normalizeConnectorStep({ capabilityId: id, parameters: {} }).capabilityId;
    return this.list().filter(m => m.actions.some(a => a.capabilityId === canonical) || m.triggers.includes(canonical) || m.conditions.includes(canonical));
  }
  findProvidersForDevice(device: DiscoveredDevice): ProviderConnectorManifest[] { const ids = new Set([device.providerId, ...(device.paths ?? []).map(p => p.providerId)]); return this.list().filter(m => ids.has(m.providerId)); }
  getDevices(): DiscoveredDevice[] { return clone(this.devices); }
  setDevices(devices: readonly DiscoveredDevice[]): void {
    if (!devices.every(d => typeof d.deviceId === "string" && d.deviceId.length > 0 && typeof d.providerId === "string" && strings(d.capabilities) && timestamp(d.observedAt) &&
      (!d.paths || d.paths.every(p => typeof p.providerId === "string" && typeof p.providerDeviceId === "string" && strings(p.capabilities) && typeof p.online === "boolean" && timestamp(p.observedAt))))) throw new Error("INVALID_DEVICE_INVENTORY");
    this.devices = clone([...devices]);
    this.changed();
  }
  resolveCapability(request: ExecutionPathRequest): ExecutionPathResolution { return resolveExecutionPath(request, this); }
  discover(providerId: string, displayName: string): ProviderConnectorManifest {
    const old = this.getProvider(providerId); if (old) return old;
    const m: ProviderConnectorManifest = { providerId, displayName, kind: "DYNAMIC", category: "unknown", deviceTypes: [], transport: "UNKNOWN", authentication: "UNKNOWN", discovery: "OFFICIAL_SOURCE_REQUIRED", triggers: [], conditions: [], actions: [], eventSchemas: {}, allowedDomains: [], localNetworkRequired: false, backgroundCapability: "NONE", commercialUseStatus: "UNKNOWN", apiVersion: "unknown", documentationSources: [], connectorVersion: 1, lifecycle: "CANDIDATE_LEGAL_REVIEW_REQUIRED", verification: emptyVerification() };
    this.registerCandidate(m); return clone(m);
  }
  executable(providerId: string, capabilityId: string): boolean {
    const m = this.manifests.get(providerId);
    const id = normalizeConnectorStep({ capabilityId, parameters: {} }).capabilityId;
    return Boolean(m && m.lifecycle === "READY" && this.eligible(m) && (m.actions.some(a => a.capabilityId === id) || m.triggers.includes(id)));
  }
  validateExecution(providerId: string, capabilityId: string, parameters: Record<string, unknown>): boolean {
    const step = normalizeConnectorStep({ capabilityId, parameters: parameters as Record<string, string | number | boolean> });
    if (!this.executable(providerId, step.capabilityId)) return false;
    const action = this.manifests.get(providerId)?.actions.find(a => a.capabilityId === step.capabilityId);
    return Boolean(action && validateSchemaValue(action.inputSchema, step.parameters));
  }
  confirmationRequired(providerId: string, capabilityId: string): boolean {
    const id = normalizeConnectorStep({ capabilityId, parameters: {} }).capabilityId;
    const action = this.manifests.get(providerId)?.actions.find(a => a.capabilityId === id);
    return Boolean(action?.confirmationRequired || action?.risk === "HIGH" || universalCapability(id)?.risk === "high");
  }
}
export function deviceSupportsOperation(device: DiscoveredDevice, capabilityId: string): boolean { return device.capabilities.includes(capabilityId); }
