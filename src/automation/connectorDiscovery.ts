import { ProviderConnectorRegistry, type DiscoveredDevice } from "./providerConnectorRegistry";
import { resolveDeviceCapability, type CapabilityResolution } from "./capabilityResolver";

export type ConnectorDiscoveryRequest = {
  providerName: string; providerHints: string[]; requestedCapabilities: string[];
  deviceHints: string[]; locale: string; region?: string; room?: string;
};
export type ConnectorDiscoveryResult = {
  providerIdentity: { providerId: string; displayName: string };
  officialDocumentationSources: import("./providerConnectorRegistry").DocumentationSource[];
  candidateManifest: import("./providerConnectorRegistry").ProviderConnectorManifest;
  authenticationType: string; transport: string; capabilities: string[]; eventSupport: boolean;
  commercialStatus: import("./providerConnectorRegistry").CommercialUseStatus;
  verificationState: "DISCOVERED" | "CANDIDATE" | "CANDIDATE_LEGAL_REVIEW_REQUIRED";
  blockingReasons: string[];
};
export function acceptDiscoveryResult(result: ConnectorDiscoveryResult, registry: ProviderConnectorRegistry): void {
  if (!["DISCOVERED", "CANDIDATE", "CANDIDATE_LEGAL_REVIEW_REQUIRED"].includes(result.verificationState) ||
      result.candidateManifest.lifecycle !== result.verificationState || result.providerIdentity.providerId !== result.candidateManifest.providerId) throw new Error("DISCOVERY_RESULT_NOT_CANDIDATE");
  registry.registerCandidate(result.candidateManifest);
}

/** Search hints only. This is not an allowlist or a claim of working integrations. */
export const ECOSYSTEM_DISCOVERY_ORDER = ["apple-home", "matter", "google-home", "smartthings", "home-assistant", "openhab", "tuya"] as const;
export const DISCOVERY_SEEDS: Readonly<Record<string, readonly string[]>> = {
  lighting: ["philips-hue", "govee", "lifx", "nanoleaf", "wiz", "ikea-dirigera", "aqara", "eve", "tapo", "meross", "ledvance", "shelly"],
  home: ["homematic-ip", "sonoff", "bosch-smart-home", "somfy", "switchbot", "netatmo", "tado", "sensibo", "nuki", "yale", "ring", "arlo", "eufy", "unifi-protect"],
  media: ["sonos", "spotify", "apple-music", "google-cast", "roku"],
  vehicle: ["tesla", "bmw", "mini", "mercedes-benz", "volkswagen", "audi", "porsche", "ford", "volvo", "polestar"],
  energy: ["easee", "go-e", "wallbox", "ocpp", "solaredge", "enphase", "tesla-powerwall"],
  appliance: ["home-connect", "miele", "samsung"],
  productivity: ["google-calendar", "microsoft-365", "gmail", "outlook", "todoist", "microsoft-to-do", "asana", "trello", "linear", "notion", "slack", "teams", "discord", "telegram", "github", "gitlab", "jira", "google-drive", "dropbox", "onedrive"],
  health: ["apple-healthkit", "fitbit", "oura", "garmin"]
};

export type DiscoveryStep = "EXISTING_REGISTRY" | "CONNECTED_ECOSYSTEM" | "OFFICIAL_LOCAL_API" | "OFFICIAL_CLOUD_API" | "OPEN_STANDARD" | "APPLE_TRIGGER_BRIDGE" | "UNSUPPORTED";
export type DiscoveryDecision = { step: DiscoveryStep; resolution?: CapabilityResolution; candidateProviderId?: string };

/** Pure, non-network discovery stage; documentation research is a separate server-only workflow. */
export function discoverConnectorPath(
  providerId: string,
  displayName: string,
  capabilityId: string,
  devices: readonly DiscoveredDevice[],
  registry: ProviderConnectorRegistry,
  targetDeviceId?: string
): DiscoveryDecision {
  const existing = registry.get(providerId);
  if (existing?.lifecycle === "READY" && existing.actions.some(action => action.capabilityId === capabilityId)) {
    const resolution = resolveDeviceCapability(capabilityId, devices.filter(device => device.providerId === providerId), registry, targetDeviceId);
    if (resolution.status === "READY") return { step: "EXISTING_REGISTRY", resolution };
  }
  const ecosystem = resolveDeviceCapability(capabilityId, devices.filter(device => ECOSYSTEM_DISCOVERY_ORDER.some(id => id === device.providerId)), registry, targetDeviceId);
  if (ecosystem.status === "READY" || ecosystem.status === "AMBIGUOUS") return { step: "CONNECTED_ECOSYSTEM", resolution: ecosystem };
  registry.discover(providerId, displayName);
  return { step: "OFFICIAL_LOCAL_API", candidateProviderId: providerId };
}
