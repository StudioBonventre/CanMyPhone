import { UNIVERSAL_CAPABILITIES } from "../../supabase/functions/_shared/universal-capabilities";
import { connectorRegistry } from "./builtinConnectorManifests";
import type { ConnectorRegistry } from "./providerConnectorRegistry";
/** Only for Apple's on-device SystemLanguageModel; never serialize this into the cloud client. */
export function registryPlanningContext(connected: readonly string[] = [], registry: ConnectorRegistry = connectorRegistry) {
  return {
    universalCapabilities: UNIVERSAL_CAPABILITIES.map(c => ({ id: c.id, role: c.role, parameters: c.parameters })),
    providers: registry.list().slice(0, 100).map(m => ({ id: m.providerId, kind: m.kind, status: m.lifecycle,
      commercialStatus: m.commercialUseStatus, connected: connected.includes(m.providerId),
      actions: m.actions.map(a => a.capabilityId), triggers: m.triggers, background: m.backgroundCapability })),
    devices: registry.getDevices().slice(0, 100).map(d => ({ id: d.deviceId, name: d.name, room: d.room,
      capabilities: d.capabilities, online: d.online !== false, providerId: d.providerId }))
  };
}
