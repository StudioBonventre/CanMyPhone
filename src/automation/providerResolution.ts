import { bindProvider, type UniversalOperation } from "./providerRegistry";
import type { ShortcutDefinition, ShortcutStep } from "./shortcutCompiler";

const providerNeutral = new Set<UniversalOperation>([
  "vehicle.lock",
  "vehicle.unlock",
  "smart-home.cover.open",
  "smart-home.cover.close",
  "smart-home.light.set",
  "smart-home.climate.set"
]);

function hasProviderHint(step: ShortcutStep) {
  return typeof step.parameters.provider === "string" || typeof step.parameters.brand === "string";
}

export function resolveConnectedProviders(
  definition: ShortcutDefinition,
  connectedProviderIds: ReadonlySet<string>
): ShortcutDefinition {
  const actions = definition.actions.map((step) => {
    if (!providerNeutral.has(step.capabilityId as UniversalOperation) || hasProviderHint(step)) return step;

    const operation = step.capabilityId as UniversalOperation;
    const binding = bindProvider(operation, {
      room: typeof step.parameters.room === "string" ? step.parameters.room : undefined,
      device: typeof step.parameters.device === "string" ? step.parameters.device : undefined,
      vehicle: typeof step.parameters.vehicle === "string" ? step.parameters.vehicle : undefined
    }, connectedProviderIds);

    if (binding.status !== "BOUND") return step;

    if (operation.startsWith("vehicle.")) {
      return {
        ...step,
        parameters: { ...step.parameters, brand: binding.provider.displayName }
      };
    }

    return {
      ...step,
      parameters: { ...step.parameters, provider: binding.provider.id }
    };
  });

  return { ...definition, actions };
}
