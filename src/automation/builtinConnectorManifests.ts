import { universalCapability } from "../../supabase/functions/_shared/universal-capabilities";
import { emptyVerification, ProviderConnectorRegistry, type ConnectorOperation, type ProviderConnectorManifest } from "./providerConnectorRegistry";

const smartHome = ["cover.open", "cover.close", "light.power.set", "light.brightness.set", "climate.temperature.set"];
function operation(id: string, needsRoom: boolean): ConnectorOperation {
  const cap = universalCapability(id)!;
  return { capabilityId: id, inputSchema: { ...cap.parameters, ...(needsRoom ? { room: { type: "string" as const, required: true } } : {}) },
    resultSchema: { ok: "boolean", confirmed: "boolean", providerId: "string", message: { type: "string", required: false } },
    risk: cap.risk.toUpperCase() as ConnectorOperation["risk"], confirmationRequired: cap.risk === "high" };
}
function builtin(providerId: string, displayName: string, transport: string, ids: string[], aliases: string[], ready: boolean, kind: ProviderConnectorManifest["kind"]): ProviderConnectorManifest {
  return {
    providerId, displayName, kind, aliases, category: providerId === "tesla" ? "vehicle" : "smart-home",
    ...(kind === "ECOSYSTEM" ? { ecosystem: providerId } : {}), deviceTypes: providerId === "tesla" ? ["vehicle"] : ["cover", "light", "climate"], transport,
    authentication: providerId === "apple-home" ? "system-permission" : providerId === "matter" ? "matter-commissioning" : transport === "CLOUD_REST" ? "oauth" : "local-pairing",
    discovery: "ADAPTER_DEVICE_INVENTORY", triggers: [], conditions: [], actions: ids.map(id => {
      const op = operation(id, providerId !== "tesla");
      if (providerId === "homematic-ip" && id === "climate.temperature.set") op.inputSchema.celsius = { type: "number", required: true, min: 5, max: 30 };
      return op;
    }), eventSchemas: {},
    allowedDomains: providerId === "tesla" ? ["fleet-api.prd.eu.vn.cloud.tesla.com", "fleet-api.prd.na.vn.cloud.tesla.com"] : [],
    localNetworkRequired: ["HOMEKIT", "MATTER", "LOCAL_REST"].includes(transport),
    backgroundCapability: ready ? "NATIVE" : "NONE", executionHost: transport === "HOMEKIT" ? "HOMEKIT" : "CANMYPHONE_NATIVE",
    eventInstallationSupported: false, commercialUseStatus: ready ? "ALLOWED" : "UNKNOWN", apiVersion: "builtin-release",
    documentationSources: [], connectorVersion: 1, lifecycle: ready ? "READY" : "CANDIDATE", verification: emptyVerification()
  };
}
// These are shipped implementation declarations, not claims of hardware or legal verification.
// Their exact release snapshot is trusted locally; remote replacements must satisfy full provenance gates.
export const BUILTIN_CONNECTOR_MANIFESTS: readonly ProviderConnectorManifest[] = [
  builtin("tesla", "Tesla", "CLOUD_REST", ["vehicle.lock", "vehicle.unlock", "vehicle.trunk.close"], ["tesla"], true, "DIRECT"),
  builtin("homematic-ip", "Homematic IP", "LOCAL_REST", smartHome, ["homematic ip", "homematic", "hmip"], true, "DIRECT"),
  { ...builtin("apple-home", "Apple Home", "HOMEKIT", smartHome, ["homekit", "apple home", "home"], true, "ECOSYSTEM"),
    triggers: ["sensor.motion.changed", "sensor.contact.changed", "trigger.homekit-characteristic", "trigger.homekit-time"], eventInstallationSupported: true,
    actions: [...smartHome.map(id => operation(id, true)), { capabilityId: "smart-home.scene.run", inputSchema: { scene: "string", home: { type: "string", required: false } }, resultSchema: { ok: "boolean", confirmed: "boolean", providerId: "string" }, risk: "MEDIUM", confirmationRequired: false }] },
  builtin("matter", "Matter", "MATTER", smartHome, ["matter"], false, "ECOSYSTEM"),
  { ...builtin("home-assistant", "Home Assistant", "LOCAL_REST", ["light.power.set", "light.brightness.set", "light.color-temperature.set", "switch.power.set", "cover.open", "cover.close", "cover.position.set", "climate.temperature.set", "climate.mode.set", "lock.lock", "lock.unlock", "media.play", "media.pause", "media.volume.set"], ["home assistant", "hass"], true, "ECOSYSTEM"),
    authentication: "oauth2-indieauth",
    discovery: "HOME_ASSISTANT_REGISTRIES",
    actions: ["light.power.set", "light.brightness.set", "light.color-temperature.set", "switch.power.set", "cover.open", "cover.close", "cover.position.set", "climate.temperature.set", "climate.mode.set", "lock.lock", "lock.unlock", "media.play", "media.pause", "media.volume.set"].map(id => operation(id, false)),
    triggers: ["sensor.motion.changed", "sensor.contact.changed", "sensor.temperature.changed"],
    eventSchemas: {
      "sensor.motion.changed": { value: "boolean" },
      "sensor.contact.changed": { value: "boolean" },
      "sensor.temperature.changed": { value: "number" }
    },
    documentationSources: [
      { url: "https://developers.home-assistant.io/docs/auth_api/", kind: "OFFICIAL_DOCS", providerOwned: true },
      { url: "https://developers.home-assistant.io/docs/api/rest/", kind: "OFFICIAL_DOCS", providerOwned: true },
      { url: "https://developers.home-assistant.io/docs/api/websocket/", kind: "OFFICIAL_DOCS", providerOwned: true }
    ],
    eventInstallationSupported: false, backgroundCapability: "NONE" },
  builtin("google-home", "Google Home", "GOOGLE_HOME", smartHome, ["google home"], false, "ECOSYSTEM"),
  builtin("smartthings", "SmartThings", "SMARTTHINGS", smartHome, ["samsung smartthings"], false, "ECOSYSTEM"),
  builtin("openhab", "openHAB", "LOCAL_REST", smartHome, ["openhab"], false, "ECOSYSTEM"),
  builtin("tuya", "Tuya / Smart Life", "CLOUD_REST", smartHome, ["tuya", "smart life"], false, "ECOSYSTEM")
];
export function createDefaultConnectorRegistry(): ProviderConnectorRegistry {
  return new ProviderConnectorRegistry([...BUILTIN_CONNECTOR_MANIFESTS], new Set(["tesla", "homematic-ip", "apple-home", "home-assistant"]), BUILTIN_CONNECTOR_MANIFESTS);
}
export const connectorRegistry = createDefaultConnectorRegistry();
