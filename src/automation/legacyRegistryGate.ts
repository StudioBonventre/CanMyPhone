import type { AutomationPlan } from "./types";
import type { ConnectorRegistry } from "./providerConnectorRegistry";
import { connectorRegistry } from "./builtinConnectorManifests";

// Compatibility for the original, schema-validated Tesla graph. Never derive an
// endpoint or operation from model output; the legacy operation is allow-listed.
export function legacyPlanProvidersReady(plan: AutomationPlan, registry: ConnectorRegistry = connectorRegistry): boolean {
  return plan.actions.every(action => action.kind !== "tesla-command" ||
    (action.capabilityId === "tesla.fleet-api.actuate-rear-trunk" && registry.executable("tesla", "vehicle.trunk.close")));
}
