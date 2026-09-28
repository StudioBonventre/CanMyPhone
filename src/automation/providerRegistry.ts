import { normalizeConnectorStep, universalCapability } from "../../supabase/functions/_shared/universal-capabilities";
import { connectorRegistry } from "./builtinConnectorManifests";
import type { ConnectorRegistry, ProviderConnectorManifest } from "./providerConnectorRegistry";
import type { ResolvedExecutionPath } from "./capabilityResolver";
import type { ConnectorDiscoveryRequest } from "./connectorDiscovery";

export type UniversalOperation = string;
export type ProviderImplementationState = "READY" | "CONNECTOR_NEEDED" | "PLANNED";
export type ConnectorAuthKind = "oauth" | "local-pairing" | "system-permission" | "matter-commissioning";
export type ProviderDescriptor = {
  id: string; displayName: string; aliases: string[];
  transport: "native" | "cloud-api" | "local-api" | "homekit" | "matter";
  operations: UniversalOperation[]; implementation: ProviderImplementationState; authKind: ConnectorAuthKind;
  requiresUserConnection: boolean; executionLocation: "device" | "cloud" | "local-network";
};
export function providerDescriptor(m: ProviderConnectorManifest): ProviderDescriptor {
  return { id: m.providerId, displayName: m.displayName, aliases: m.aliases ?? [],
    transport: m.transport === "HOMEKIT" ? "homekit" : m.transport === "MATTER" ? "matter" : m.localNetworkRequired ? "local-api" : "cloud-api",
    operations: [...m.actions.map(a => a.capabilityId), ...m.triggers], implementation: m.lifecycle === "READY" && m.commercialUseStatus === "ALLOWED" ? "READY" : "PLANNED",
    authKind: (["oauth", "local-pairing", "system-permission", "matter-commissioning"].includes(m.authentication) ? m.authentication : "oauth") as ConnectorAuthKind,
    requiresUserConnection: m.authentication !== "none", executionLocation: m.transport === "HOMEKIT" || m.transport === "MATTER" ? "device" : m.localNetworkRequired ? "local-network" : "cloud" };
}
// Compatibility view only. Routing below always queries the registry.
export const PROVIDER_REGISTRY: readonly ProviderDescriptor[] = connectorRegistry.list().map(providerDescriptor);
export type ProviderTargetHints = { provider?: string; brand?: string; room?: string; device?: string; vehicle?: string };
export type ProviderBinding =
  | { status: "BOUND"; provider: ProviderDescriptor; operation: UniversalOperation; path?: ResolvedExecutionPath }
  | { status: "CONNECTION_REQUIRED" | "NOT_IMPLEMENTED"; provider: ProviderDescriptor; operation: UniversalOperation }
  | { status: "AMBIGUOUS"; candidates: ProviderDescriptor[]; operation: UniversalOperation }
  | { status: "DEVICE_CAPABILITY_MISMATCH"; operation: UniversalOperation; providerHint?: string }
  | { status: "DISCOVERY_REQUIRED"; operation: UniversalOperation; request: ConnectorDiscoveryRequest; fallbackCandidates: ProviderDescriptor[] }
  | { status: "UNSUPPORTED"; operation: UniversalOperation; fallbackCandidates: ProviderDescriptor[] };
const normalized = (v?: string) => v?.trim().toLowerCase();
const operationId = (id: string) => id === "smart-home.light.set" ? "light.power.set" : normalizeConnectorStep({ capabilityId: id, parameters: {} }).capabilityId;
export function providersForOperation(operation: UniversalOperation, registry: ConnectorRegistry = connectorRegistry): ProviderDescriptor[] {
  return registry.findProvidersForCapability(operationId(operation)).map(providerDescriptor);
}
export function bindProvider(operation: UniversalOperation, hints: ProviderTargetHints, connectedProviderIds: ReadonlySet<string> = new Set(), registry: ConnectorRegistry = connectorRegistry): ProviderBinding {
  const canonical = operationId(operation);
  const requested = normalized(hints.provider) ?? normalized(hints.brand);
  const fallbacks = registry.findProvidersForCapability(canonical).filter(m => m.kind === "ECOSYSTEM").map(providerDescriptor);
  const matchedProvider = requested ? registry.list().find(m => [m.providerId, m.displayName.toLowerCase(), ...(m.aliases ?? []).map(normalized)].includes(requested)) : undefined;
  if (matchedProvider && ["BLOCKED", "DEPRECATED"].includes(matchedProvider.lifecycle)) return { status: "NOT_IMPLEMENTED", provider: providerDescriptor(matchedProvider), operation };
  const inventory = registry.getDevices();
  const devices = requested && matchedProvider && !hints.device
    ? inventory.filter(d => d.providerId === matchedProvider.providerId || d.paths?.some(p => p.providerId === matchedProvider.providerId)) : inventory;
  if (devices.length && (!requested || matchedProvider || hints.device)) {
    const resolution = registry.resolveCapability({ capabilityId: canonical, devices, role: universalCapability(canonical)?.role, connectedProviderIds, deviceName: hints.device, room: hints.room, preferredProviderId: matchedProvider?.providerId });
    if (resolution.status === "READY") {
      const provider = registry.getProvider(resolution.path.providerId)!;
      return { status: "BOUND", operation, provider: providerDescriptor(provider), path: resolution.path };
    }
    if (resolution.status === "AMBIGUOUS") return { status: "AMBIGUOUS", operation, candidates: [...new Set(resolution.candidates.map(p => p.providerId))].map(id => providerDescriptor(registry.getProvider(id)!)) };
    if ((hints.device || hints.room) && (!requested || matchedProvider?.lifecycle === "READY")) return { status: "DEVICE_CAPABILITY_MISMATCH", operation, providerHint: requested };
  }
  if (requested && (!matchedProvider || matchedProvider.lifecycle !== "READY")) {
    return { status: "DISCOVERY_REQUIRED", operation, request: { providerName: hints.provider ?? hints.brand!, providerHints: [hints.provider ?? hints.brand!], requestedCapabilities: [canonical], deviceHints: hints.device ? [hints.device] : [], locale: "de", ...(hints.room ? { room: hints.room } : {}) }, fallbackCandidates: fallbacks };
  }
  let matches = registry.findProvidersForCapability(canonical).filter(m => !matchedProvider || m.providerId === matchedProvider.providerId);
  if (!matches.length) return { status: "UNSUPPORTED", operation, fallbackCandidates: fallbacks };
  if (!requested) {
    const connected = matches.filter(m => connectedProviderIds.has(m.providerId) && registry.executable(m.providerId, canonical));
    if (connected.length === 1) matches = connected;
    else if (connected.length > 1) return { status: "AMBIGUOUS", operation, candidates: connected.map(providerDescriptor) };
    else {
      const ready = matches.filter(m => registry.executable(m.providerId, canonical));
      if (ready.length === 1) matches = ready;
      else return { status: "AMBIGUOUS", operation, candidates: matches.map(providerDescriptor) };
    }
  }
  const manifest = matches[0]!;
  const provider = providerDescriptor(manifest);
  if (!registry.executable(manifest.providerId, canonical)) return { status: "NOT_IMPLEMENTED", provider, operation };
  if (provider.requiresUserConnection && !connectedProviderIds.has(provider.id)) return { status: "CONNECTION_REQUIRED", provider, operation };
  return { status: "BOUND", provider, operation };
}
export function compactProviderCatalogue(registry: ConnectorRegistry = connectorRegistry): string {
  return registry.list().map(m => [m.providerId, m.displayName, m.kind, m.actions.map(a => a.capabilityId).join(","), m.lifecycle, m.commercialUseStatus].join(" | ")).join("\n");
}
