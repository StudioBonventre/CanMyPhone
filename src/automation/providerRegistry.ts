export type UniversalOperation =
  | "vehicle.lock"
  | "vehicle.unlock"
  | "smart-home.cover.open"
  | "smart-home.cover.close"
  | "smart-home.light.set"
  | "smart-home.climate.set";

export type ProviderImplementationState = "READY" | "CONNECTOR_NEEDED" | "PLANNED";

export type ProviderDescriptor = {
  id: string;
  displayName: string;
  aliases: string[];
  transport: "native" | "cloud-api" | "local-api" | "homekit" | "matter";
  operations: UniversalOperation[];
  implementation: ProviderImplementationState;
  requiresUserConnection: boolean;
};

export const PROVIDER_REGISTRY: readonly ProviderDescriptor[] = [
  {
    id: "tesla",
    displayName: "Tesla",
    aliases: ["tesla"],
    transport: "cloud-api",
    operations: ["vehicle.lock","vehicle.unlock"],
    implementation: "CONNECTOR_NEEDED",
    requiresUserConnection: true
  },
  {
    id: "homematic-ip",
    displayName: "Homematic IP",
    aliases: ["homematic ip","homematic","hmip"],
    transport: "local-api",
    operations: ["smart-home.cover.open","smart-home.cover.close","smart-home.light.set","smart-home.climate.set"],
    implementation: "CONNECTOR_NEEDED",
    requiresUserConnection: true
  },
  {
    id: "apple-home",
    displayName: "Apple Home / HomeKit",
    aliases: ["homekit","apple home","home"],
    transport: "homekit",
    operations: ["smart-home.cover.open","smart-home.cover.close","smart-home.light.set","smart-home.climate.set"],
    implementation: "PLANNED",
    requiresUserConnection: true
  },
  {
    id: "matter",
    displayName: "Matter",
    aliases: ["matter"],
    transport: "matter",
    operations: ["smart-home.cover.open","smart-home.cover.close","smart-home.light.set","smart-home.climate.set"],
    implementation: "PLANNED",
    requiresUserConnection: true
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
  | { status: "AMBIGUOUS"; candidates: ProviderDescriptor[]; operation: UniversalOperation }
  | { status: "UNSUPPORTED"; operation: UniversalOperation };

function normalized(value?: string) {
  return value?.trim().toLowerCase();
}

export function providersForOperation(operation: UniversalOperation): ProviderDescriptor[] {
  return PROVIDER_REGISTRY.filter((provider) => provider.operations.includes(operation));
}

export function bindProvider(operation: UniversalOperation, hints: ProviderTargetHints): ProviderBinding {
  const candidates = providersForOperation(operation);
  if (!candidates.length) return { status: "UNSUPPORTED", operation };

  const requested = normalized(hints.provider) ?? normalized(hints.brand);
  const matched = requested
    ? candidates.filter((provider) =>
        provider.id === requested ||
        provider.displayName.toLowerCase() === requested ||
        provider.aliases.some((alias) => requested.includes(alias) || alias.includes(requested))
      )
    : candidates;

  if (!matched.length) return { status: "UNSUPPORTED", operation };
  if (matched.length > 1 && !requested) return { status: "AMBIGUOUS", candidates: matched, operation };

  const provider = matched[0]!;
  return provider.implementation === "READY"
    ? { status: "BOUND", provider, operation }
    : { status: "CONNECTION_REQUIRED", provider, operation };
}
