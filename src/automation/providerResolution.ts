import { connectorRequirementForStep } from "./connectorPlanning";
import { connectorRegistry } from "./builtinConnectorManifests";
import type { ConnectorRegistry } from "./providerConnectorRegistry";
import type { ShortcutDefinition, ShortcutStep } from "./shortcutCompiler";
import { capabilityV2 } from "./capabilityCatalogV2";
export function resolveConnectedProviders(definition: ShortcutDefinition, connectedProviderIds: ReadonlySet<string>, registry: ConnectorRegistry = connectorRegistry): ShortcutDefinition {
  const resolve = (step: ShortcutStep): ShortcutStep => {
    const requirement = connectorRequirementForStep(step, connectedProviderIds, registry);
    if (!requirement || requirement.binding.status !== "BOUND") return step;
    const binding = requirement.binding;
    if (["tesla.rear-trunk.close", "smart-home.scene.run", "trigger.homekit-characteristic", "trigger.homekit-time"].includes(step.capabilityId)) return step;
    const parameter = step.capabilityId === "vehicle.lock" || step.capabilityId === "vehicle.unlock" ? "brand" : "provider";
    const device = binding.path ? registry.getDevices().find(d => d.deviceId === binding.path!.deviceId) : undefined;
    const parameters = { ...step.parameters, [parameter]: parameter === "brand" ? binding.provider.displayName : binding.provider.id };
    if (device?.room && capabilityV2(step.capabilityId)?.parameters.room) parameters.room = device.room;
    if (binding.path && capabilityV2(step.capabilityId)?.parameters.device) parameters.device = binding.path.providerDeviceId;
    return { ...step, parameters };
  };
  return { ...definition, trigger: resolve(definition.trigger), actions: definition.actions.map(resolve) };
}
