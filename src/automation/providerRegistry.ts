export type UniversalOperation =
  | "vehicle.lock"
  | "vehicle.unlock"
  | "smart-home.cover.open"
  | "smart-home.cover.close"
  | "smart-home.light.set"
  | "smart-home.climate.set";

export type ProviderImplementationState = "READY" | "CONNECTOR_NEEDED" | "PLANNED";
export type ConnectorAuthKind = "oauth" | "local-pairing" | "system-permission" | "matter-commissioning";

export type ProviderDescriptor = {
  id: string;
  displayName: string;
  aliases: string[];
  transport: "native" | "cloud-api" | "local-api" | "homekit" | "matter";
  operations: UniversalOperation[];
  implementation: ProviderImplementationState;
  authKind: ConnectorAuthKind;
  requiresUserConnection: boolean;
  executionLocation: "device" | "cloud" | "local-network";
};

export const PROVIDER_REGISTRY: readonly ProviderDescriptor[] = [
  {
    id: "tesla",
    displayName: "Tesla",
    aliases: ["tesla"],
    transport: "cloud-api",
    operations: ["vehicle.lock","vehicle.unlock"],
    implementation: "CONNECTOR_NEEDED",
    authKind: "oauth",
    requiresUserConnection: true,
    executionLocation: "cloud"
  },
  {
    id: "homematic-ip",
    displayName: "Homematic IP",
    aliases: ["homematic ip","homematic","hmip"],
    transport: "local-api",
    operations: ["smart-home.cover.open","smart-home.cover.close","smart-home.light.set","smart-home.climate.set"],
    implementation: "CONNECTOR_NEEDED",
    authKind: "local-pairing",
    requiresUserConnection: true,
    executionLocation: "local-network"
  },
  {
    id: "apple-home",
    displayName: "Apple Home",
    aliases: ["homekit","apple home","home"],
    transport: "homekit",
    operations: ["smart-home.cover.open","smart-home.cover.close","smart-home.light.set","smart-home.climate.set"],
    implementation: "PLANNED",
    authKind: "system-permission",
    requiresUserConnection: true,
    executionLocation: "device"
  },
  {
    id: "matter",
    displayName: "Matter",
    aliases: ["matter"],
    transport: "matter",
    operations: ["smart-home.cover.open","smart-home.cover.close","smart-home.light.set","smart-home.climate.set"],
    implementation: "PLANNED",
    authKind: "matter-commissioning",
    requiresUserConnection: true,
    executionLocation: "device"
  },
  {
    id: "home-assistant",
    displayName: "Home Assistant",
    aliases: ["home assistant","hass"],
    transport: "local-api",
    operations: ["smart-home.cover.open","smart-home.cover.close","smart-home.light.set","smart-home.climate.set"],
    implementation: "PLANNED",
    authKind: "local-pairing",
    requiresUserConnection: true,
    executionLocation: "local-network"
  }
] as const;

export type ProviderTargetHints = {
  provider?: string;
  brand?: string;
  room?: string;
  device?: string;
  vehicle?: string;
};

export type ProviderBinding =
  | { status: "BOUND"; provider: ProviderDescriptor; operation: UniversalOperation }
  | { status: "CONNECTION_REQUIRED"; provider: ProviderDescriptor; operation: UniversalOperation }
  | { status: "NOT_IMPLEMENTED"; provider: ProviderDescriptor; operation: UniversalOperation }
  | { status: "AMBIGUOUS"; candidates: ProviderDescriptor[]; operation: UniversalOperation }
  | { status: "UNSUPPORTED"; operation: UniversalOperation; fallbackCandidates: ProviderDescriptor[] };

function normalized(value?: string) {
  return value?.trim().toLowerCase();
}

export function providersForOperation(operation: UniversalOperation): ProviderDescriptor[] {
  return PROVIDER_REGISTRY.filter((provider) => provider.operations.includes(operation));
}

function fallbackCandidates(operation: UniversalOperation): ProviderDescriptor[] {
  if (!operation.startsWith("smart-home.")) return [];
  return PROVIDER_REGISTRY.filter((provider) =>
    ["apple-home","matter","home-assistant"].includes(provider.id) &&
    provider.operations.includes(operation)
  );
}

export function bindProvider(
  operation: UniversalOperation,
  hints: ProviderTargetHints,
  connectedProviderIds: ReadonlySet<string> = new Set()
): ProviderBinding {
  const candidates = providersForOperation(operation);
  if (!candidates.length) return { status: "UNSUPPORTED", operation, fallbackCandidates: [] };

  const requested = normalized(hints.provider) ?? normalized(hints.brand);
  const matched = requested
    ? candidates.filter((provider) =>
        provider.id === requested ||
        provider.displayName.toLowerCase() === requested ||
        provider.aliases.some((alias) => requested.includes(alias) || alias.includes(requested))
      )
    : candidates;

  if (!matched.length) return { status: "UNSUPPORTED", operation, fallbackCandidates: fallbackCandidates(operation) };
  if (matched.length > 1 && !requested) return { status: "AMBIGUOUS", candidates: matched, operation };

  const provider = matched[0]!;
  if (provider.implementation === "PLANNED") return { status: "NOT_IMPLEMENTED", provider, operation };
  if (provider.requiresUserConnection && !connectedProviderIds.has(provider.id)) {
    return { status: "CONNECTION_REQUIRED", provider, operation };
  }
  return { status: "BOUND", provider, operation };
}

export function compactProviderCatalogue(): string {
  return PROVIDER_REGISTRY.map((provider) =>
    `${provider.id} | ${provider.displayName} | ${provider.operations.join(",")} | ${provider.implementation}`
  ).join("\n");
}
