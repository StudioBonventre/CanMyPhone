import { capabilityV2 } from "./capabilityCatalogV2";
import {
  bindProvider,
  type ProviderBinding,
  type ProviderTargetHints,
  type UniversalOperation
} from "./providerRegistry";
import type { ShortcutDefinition, ShortcutStep } from "./shortcutCompiler";

export type ConnectorRequirement = {
  capabilityId: string;
  binding: ProviderBinding;
};

export type ConnectorPlan = {
  requirements: ConnectorRequirement[];
  ready: boolean;
  connectionRequired: boolean;
  notImplemented: boolean;
  ambiguous: boolean;
};

const universal = new Set<UniversalOperation>([
  "vehicle.lock",
  "vehicle.unlock",
  "smart-home.cover.open",
  "smart-home.cover.close",
  "smart-home.light.set",
  "smart-home.climate.set"
]);

function hints(step: ShortcutStep): ProviderTargetHints {
  const read = (key: string) => {
    const v = step.parameters[key];
    return typeof v === "string" ? v : undefined;
  };
  return { provider: read("provider"), brand: read("brand"), room: read("room"), device: read("device"), vehicle: read("vehicle") };
}

function requirementForStep(step: ShortcutStep, connected: ReadonlySet<string>): ConnectorRequirement | null {
  if (universal.has(step.capabilityId as UniversalOperation)) {
    const operation = step.capabilityId as UniversalOperation;
    return { capabilityId: step.capabilityId, binding: bindProvider(operation, hints(step), connected) };
  }

  const cap = capabilityV2(step.capabilityId);
  if (!cap?.integration && !cap?.executionModes.includes("THIRD_PARTY_API")) return null;

  if (step.capabilityId === "tesla.rear-trunk.close") {
    return { capabilityId: step.capabilityId, binding: bindProvider("vehicle.lock", { brand: "Tesla" }, connected) };
  }
  return null;
}

export function connectorPlanForDefinition(definition: ShortcutDefinition, connected: ReadonlySet<string> = new Set()): ConnectorPlan {
  const requirements = definition.actions
    .map((step) => requirementForStep(step, connected))
    .filter((item): item is ConnectorRequirement => Boolean(item));

  const states = requirements.map((item) => item.binding.status);
  return {
    requirements,
    ready: requirements.every((item) => item.binding.status === "BOUND"),
    connectionRequired: states.includes("CONNECTION_REQUIRED"),
    notImplemented: states.includes("NOT_IMPLEMENTED") || states.includes("UNSUPPORTED"),
    ambiguous: states.includes("AMBIGUOUS")
  };
}
