import { capabilityV2 } from "./capabilityCatalogV2";
import { bindProvider, type ProviderBinding, type ProviderTargetHints } from "./providerRegistry";
import { normalizeConnectorStep, universalCapability } from "../../supabase/functions/_shared/universal-capabilities";
import { connectorRegistry } from "./builtinConnectorManifests";
import type { ConnectorRegistry } from "./providerConnectorRegistry";
import type { ConnectorDiscoveryRequest } from "./connectorDiscovery";
import type { ShortcutDefinition, ShortcutStep } from "./shortcutCompiler";
export type ConnectorRequirement = { capabilityId: string; role: "trigger" | "action"; binding: ProviderBinding };
export type ConnectorPlan = { requirements: ConnectorRequirement[]; ready: boolean; connectionRequired: boolean; notImplemented: boolean; ambiguous: boolean; discoveryRequired: boolean; discoveryRequests: ConnectorDiscoveryRequest[] };
function hints(step: ShortcutStep): ProviderTargetHints {
  const read = (key: string) => typeof step.parameters[key] === "string" ? step.parameters[key] as string : undefined;
  return { provider: read("provider"), brand: read("brand"), room: read("room"), device: read("device"), vehicle: read("vehicle") };
}
export function connectorRequirementForStep(step: ShortcutStep, connected: ReadonlySet<string> = new Set(), registry: ConnectorRegistry = connectorRegistry): ConnectorRequirement | null {
  const normalized = normalizeConnectorStep(step);
  const cap = capabilityV2(step.capabilityId);
  const universal = universalCapability(normalized.capabilityId);
  if (!universal && !["smart-home.scene.run", "trigger.homekit-characteristic", "trigger.homekit-time", "trigger.provider-event"].includes(step.capabilityId)) return null;
  const operation = step.capabilityId === "trigger.provider-event" ? String(step.parameters.event) : normalized.capabilityId;
  const targetHints = ["smart-home.scene.run", "trigger.homekit-characteristic", "trigger.homekit-time"].includes(step.capabilityId) ? { ...hints(normalized), provider: "apple-home" } : hints(normalized);
  return { capabilityId: step.capabilityId, role: cap?.role === "trigger" ? "trigger" : "action", binding: bindProvider(operation, targetHints, connected, registry) };
}
export function connectorPlanForDefinition(definition: ShortcutDefinition, connected: ReadonlySet<string> = new Set(), registry: ConnectorRegistry = connectorRegistry): ConnectorPlan {
  const requirements = [definition.trigger, ...definition.actions].map(step => connectorRequirementForStep(step, connected, registry)).filter((item): item is ConnectorRequirement => Boolean(item));
  const states = requirements.map(item => item.binding.status);
  const discoveryRequests = requirements.flatMap(item => item.binding.status === "DISCOVERY_REQUIRED" ? [item.binding.request] : []);
  return { requirements, ready: requirements.every(item => item.binding.status === "BOUND"), connectionRequired: states.includes("CONNECTION_REQUIRED"),
    notImplemented: states.includes("NOT_IMPLEMENTED") || states.includes("UNSUPPORTED") || states.includes("DEVICE_CAPABILITY_MISMATCH"),
    ambiguous: states.includes("AMBIGUOUS"), discoveryRequired: discoveryRequests.length > 0, discoveryRequests };
}
