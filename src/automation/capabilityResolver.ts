import { ProviderConnectorRegistry, type DiscoveredDevice } from "./providerConnectorRegistry";

export type CapabilityRoute = { providerId: string; deviceId: string; capabilityId: string };
export type CapabilityResolution = { status: "READY"; route: CapabilityRoute } | { status: "UNAVAILABLE" | "AMBIGUOUS"; candidates: CapabilityRoute[] };

// The connected device inventory is authoritative. Brand names and seed hints never confer capabilities.
const ecosystemOrder = ["apple-home", "matter", "google-home", "smartthings", "home-assistant", "openhab", "tuya"];
export function resolveDeviceCapability(
  capabilityId: string,
  devices: readonly DiscoveredDevice[],
  registry: ProviderConnectorRegistry,
  targetDeviceId?: string
): CapabilityResolution {
  const candidates = devices
    .filter(device => (!targetDeviceId || device.deviceId === targetDeviceId) && device.capabilities.includes(capabilityId))
    .filter(device => registry.executable(device.providerId, capabilityId))
    .map(device => ({ providerId: device.providerId, deviceId: device.deviceId, capabilityId }));
  if (!candidates.length) return { status: "UNAVAILABLE", candidates: [] };
  // Multiple physical devices are never silently conflated, even if the same brand is requested.
  if (!targetDeviceId && new Set(candidates.map(item => item.deviceId)).size > 1) return { status: "AMBIGUOUS", candidates };
  candidates.sort((a, b) => {
    const rank = (id: string) => { const index = ecosystemOrder.indexOf(id); return index < 0 ? ecosystemOrder.length : index; };
    return rank(a.providerId) - rank(b.providerId);
  });
  return { status: "READY", route: candidates[0]! };
}
