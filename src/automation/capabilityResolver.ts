import type { ConnectorRegistry, DiscoveredDevice, ProviderPath } from "./providerConnectorRegistry";
export type ResolvedExecutionPath = {
  universalCapability: string; providerId: string; deviceId: string; providerDeviceId: string;
  transport: string; triggerHost?: string; actionHost?: string; confidence: number; reason: string;
  fallbackProviders: string[]; score: number;
};
export type ExecutionPathRequest = {
  capabilityId: string; devices?: readonly DiscoveredDevice[]; deviceId?: string; deviceName?: string; room?: string;
  connectedProviderIds?: ReadonlySet<string>; preferredProviderId?: string; role?: "trigger" | "action";
  requireBackground?: boolean; region?: string; now?: number; maxInventoryAgeMs?: number;
};
export type ExecutionPathResolution = { status: "READY"; path: ResolvedExecutionPath } |
  { status: "UNAVAILABLE" | "AMBIGUOUS"; candidates: ResolvedExecutionPath[] };
export function resolveExecutionPath(request: ExecutionPathRequest, registry: ConnectorRegistry): ExecutionPathResolution {
  const same = (a?: string, b?: string) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());
  const devices = (request.devices ?? registry.getDevices()).filter(d =>
    (!request.deviceId || d.deviceId === request.deviceId) && (!request.deviceName || same(d.name, request.deviceName) || d.deviceId === request.deviceName || d.paths?.some(p => p.providerDeviceId === request.deviceName)) &&
    (!request.room || same(d.room, request.room)));
  const candidates: ResolvedExecutionPath[] = [];
  for (const device of devices) {
    const paths: ProviderPath[] = device.paths?.length ? device.paths : [{
      providerId: device.providerId, providerDeviceId: device.deviceId, capabilities: device.capabilities,
      observedAt: device.observedAt, online: device.online !== false
    }];
    for (const path of paths) {
      const manifest = registry.getProvider(path.providerId);
      if (!manifest || !path.online || path.credentialReady === false || !path.capabilities.includes(request.capabilityId) ||
        !registry.executable(path.providerId, request.capabilityId) ||
        (request.connectedProviderIds && !request.connectedProviderIds.has(path.providerId)) ||
        (request.region && manifest.regionAvailability?.length && !manifest.regionAvailability.includes(request.region)) ||
        (request.requireBackground && (path.background === false || !["NATIVE", "SERVER"].includes(manifest.backgroundCapability))) ||
        (request.role === "trigger" && (!manifest.triggers.includes(request.capabilityId) || path.eventSupport === false))) continue;
      if (request.maxInventoryAgeMs !== undefined && (request.now ?? Date.now()) - Date.parse(path.observedAt) > request.maxInventoryAgeMs) continue;
      const local = manifest.localNetworkRequired || ["HOMEKIT", "MATTER", "LOCAL_REST", "OCPP"].includes(manifest.transport);
      const bounded = (v: number | undefined, fallback: number) => v !== undefined && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
      const reliability = bounded(path.reliability, 0.5);
      const score = (request.preferredProviderId === path.providerId ? 1000 : 0) + (local ? 100 : 0) +
        reliability * 40 + (path.background ? 12 : 0) + (path.eventSupport ? 8 : 0) +
        bounded(path.privacy, local ? 1 : 0.3) * 15 +
        (path.credentialReady ? 5 : 0) - Math.min(20, Math.max(0, path.latencyMs ?? 1000) / 1000);
      const host = manifest.executionHost ?? manifest.transport;
      candidates.push({
        universalCapability: request.capabilityId, providerId: path.providerId, deviceId: device.deviceId,
        providerDeviceId: path.providerDeviceId, transport: manifest.transport,
        ...(request.role === "trigger" ? { triggerHost: host } : { actionHost: host }),
        confidence: Math.min(0.99, 0.7 + reliability * 0.2), score,
        reason: [request.preferredProviderId === path.providerId ? "Nutzerpräferenz" : "", local ? "lokale Verbindung" : "Cloud-Verbindung", "Gerätefähigkeit erkannt", "Connector freigegeben"].filter(Boolean).join("; "),
        fallbackProviders: []
      });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.providerId.localeCompare(b.providerId) || a.providerDeviceId.localeCompare(b.providerDeviceId));
  if (!candidates.length) return { status: "UNAVAILABLE", candidates: [] };
  if (new Set(candidates.map(p => p.deviceId)).size > 1) return { status: "AMBIGUOUS", candidates };
  const path = { ...candidates[0]!, fallbackProviders: [...new Set(candidates.slice(1).map(p => p.providerId))] };
  return { status: "READY", path };
}
export type CapabilityRoute = { providerId: string; deviceId: string; capabilityId: string };
export type CapabilityResolution = { status: "READY"; route: CapabilityRoute } | { status: "UNAVAILABLE" | "AMBIGUOUS"; candidates: CapabilityRoute[] };
export function resolveDeviceCapability(capabilityId: string, devices: readonly DiscoveredDevice[], registry: ConnectorRegistry, targetDeviceId?: string): CapabilityResolution {
  const result = registry.resolveCapability({ capabilityId, devices, deviceId: targetDeviceId });
  const route = (p: ResolvedExecutionPath): CapabilityRoute => ({ providerId: p.providerId, deviceId: p.deviceId, capabilityId: p.universalCapability });
  return result.status === "READY" ? { status: "READY", route: route(result.path) } : { status: result.status, candidates: result.candidates.map(route) };
}
