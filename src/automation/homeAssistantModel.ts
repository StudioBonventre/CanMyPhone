import type { ConnectorExecutionRequest } from "./connectorRuntime";
import type { DiscoveredDevice } from "./providerConnectorRegistry";

export type HomeAssistantState = {
  entity_id: string;
  state: string;
  last_changed?: string;
  last_updated?: string;
  attributes: Record<string, unknown>;
  context?: { id?: string | null };
};

export type HomeAssistantEntityRegistryEntry = {
  ei: string;
  pl: string;
  ai?: string;
  di?: string;
  en?: string;
  hb?: boolean;
};

export type HomeAssistantArea = { area_id: string; name: string };
export type HomeAssistantDevice = {
  id: string;
  area_id?: string | null;
  parent_device_id?: string | null;
  name?: string | null;
  name_by_user?: string | null;
};

export type HomeAssistantServiceCall = {
  domain: string;
  service: string;
  serviceData: Record<string, string | number | boolean>;
};

const LIGHT_BRIGHTNESS_MODES = new Set(["brightness", "color_temp", "hs", "xy", "rgb", "rgbw", "rgbww", "white"]);
const LIGHT_COLOR_MODES = new Set(["hs", "xy", "rgb", "rgbw", "rgbww"]);
const CONTACT_CLASSES = new Set(["door", "garage_door", "opening", "window"]);
const MOTION_CLASSES = new Set(["motion", "occupancy"]);

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export function homeAssistantCapabilitiesForState(state: HomeAssistantState): string[] {
  const domain = state.entity_id.split(".", 1)[0] ?? "";
  const attrs = state.attributes ?? {};
  const supported = finiteNumber(attrs.supported_features) ?? 0;
  const capabilities = new Set<string>();

  if (domain === "light") {
    capabilities.add("light.power.set");
    const modes = stringArray(attrs.supported_color_modes);
    if (modes.some(mode => LIGHT_BRIGHTNESS_MODES.has(mode)) || finiteNumber(attrs.brightness) !== undefined) capabilities.add("light.brightness.set");
    if (modes.some(mode => LIGHT_COLOR_MODES.has(mode))) capabilities.add("light.color.set");
    if (modes.includes("color_temp") || finiteNumber(attrs.color_temp_kelvin) !== undefined) capabilities.add("light.color-temperature.set");
  } else if (domain === "switch") {
    capabilities.add("switch.power.set");
  } else if (domain === "cover") {
    if ((supported & 1) !== 0 || supported === 0) capabilities.add("cover.open");
    if ((supported & 2) !== 0 || supported === 0) capabilities.add("cover.close");
    if ((supported & 4) !== 0 || finiteNumber(attrs.current_position) !== undefined) capabilities.add("cover.position.set");
  } else if (domain === "climate") {
    if ((supported & 1) !== 0 || finiteNumber(attrs.temperature) !== undefined) capabilities.add("climate.temperature.set");
    if (stringArray(attrs.hvac_modes).length) capabilities.add("climate.mode.set");
  } else if (domain === "lock") {
    capabilities.add("lock.lock");
    capabilities.add("lock.unlock");
  } else if (domain === "media_player") {
    capabilities.add("media.play");
    capabilities.add("media.pause");
    if (finiteNumber(attrs.volume_level) !== undefined) capabilities.add("media.volume.set");
  } else if (domain === "binary_sensor") {
    const deviceClass = typeof attrs.device_class === "string" ? attrs.device_class : "";
    if (MOTION_CLASSES.has(deviceClass)) capabilities.add("sensor.motion.changed");
    if (CONTACT_CLASSES.has(deviceClass)) capabilities.add("sensor.contact.changed");
  } else if (domain === "sensor" && attrs.device_class === "temperature") {
    capabilities.add("sensor.temperature.changed");
  }

  return [...capabilities];
}

export function discoverHomeAssistantEntities(
  states: readonly HomeAssistantState[],
  entityEntries: readonly HomeAssistantEntityRegistryEntry[] = [],
  areas: readonly HomeAssistantArea[] = [],
  devices: readonly HomeAssistantDevice[] = [],
  observedAt = new Date().toISOString()
): DiscoveredDevice[] {
  const entitiesById = new Map(entityEntries.map(entry => [entry.ei, entry]));
  const areasById = new Map(areas.map(area => [area.area_id, area.name]));
  const devicesById = new Map(devices.map(device => [device.id, device]));

  const resolveAreaId = (entry?: HomeAssistantEntityRegistryEntry): string | undefined => {
    if (entry?.ai) return entry.ai;
    if (!entry?.di) return undefined;
    const device = devicesById.get(entry.di);
    if (device?.area_id) return device.area_id;
    if (device?.parent_device_id) return devicesById.get(device.parent_device_id)?.area_id ?? undefined;
    return undefined;
  };

  return states.flatMap(state => {
    const capabilities = homeAssistantCapabilitiesForState(state);
    if (!capabilities.length || !state.entity_id.includes(".")) return [];
    const entry = entitiesById.get(state.entity_id);
    const areaId = resolveAreaId(entry);
    const name = entry?.en || (typeof state.attributes.friendly_name === "string" ? state.attributes.friendly_name : state.entity_id);
    const domain = state.entity_id.split(".", 1)[0]!;
    return [{
      deviceId: `home-assistant:${state.entity_id}`,
      providerId: "home-assistant",
      capabilities,
      observedAt,
      name,
      ecosystem: "home-assistant",
      deviceClass: domain,
      ...(areaId && areasById.get(areaId) ? { room: areasById.get(areaId) } : {}),
      online: !["unavailable", "unknown"].includes(state.state),
      metadata: {
        entityId: state.entity_id,
        platform: entry?.pl ?? "unknown",
        ...(entry?.di ? { homeAssistantDeviceId: entry.di } : {})
      },
      paths: [{
        providerId: "home-assistant",
        providerDeviceId: state.entity_id,
        capabilities,
        online: !["unavailable", "unknown"].includes(state.state),
        observedAt,
        reliability: 0.9,
        privacy: 0.9,
        background: false,
        eventSupport: true,
        credentialReady: true
      }]
    }];
  });
}

export function homeAssistantServiceCallForRequest(request: ConnectorExecutionRequest): HomeAssistantServiceCall | null {
  const entityId = request.providerDeviceId;
  if (!entityId || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(entityId)) return null;
  const p = request.parameters;
  const base = { entity_id: entityId };

  switch (request.capabilityId) {
    case "light.power.set":
      return { domain: "light", service: p.on === true ? "turn_on" : "turn_off", serviceData: base };
    case "light.brightness.set":
      return typeof p.percent === "number" && p.percent >= 0 && p.percent <= 100
        ? { domain: "light", service: "turn_on", serviceData: { ...base, brightness_pct: p.percent } } : null;
    case "light.color-temperature.set":
      return typeof p.kelvin === "number" && p.kelvin >= 1000 && p.kelvin <= 10000
        ? { domain: "light", service: "turn_on", serviceData: { ...base, color_temp_kelvin: p.kelvin } } : null;
    case "switch.power.set":
      return { domain: "switch", service: p.on === true ? "turn_on" : "turn_off", serviceData: base };
    case "cover.open":
      return { domain: "cover", service: "open_cover", serviceData: base };
    case "cover.close":
      return { domain: "cover", service: "close_cover", serviceData: base };
    case "cover.position.set":
      return typeof p.percent === "number" && p.percent >= 0 && p.percent <= 100
        ? { domain: "cover", service: "set_cover_position", serviceData: { ...base, position: p.percent } } : null;
    case "climate.temperature.set":
      return typeof p.celsius === "number" && p.celsius >= 5 && p.celsius <= 35
        ? { domain: "climate", service: "set_temperature", serviceData: { ...base, temperature: p.celsius } } : null;
    case "climate.mode.set":
      return typeof p.mode === "string" && p.mode.trim()
        ? { domain: "climate", service: "set_hvac_mode", serviceData: { ...base, hvac_mode: p.mode } } : null;
    case "lock.lock":
      return { domain: "lock", service: "lock", serviceData: base };
    case "lock.unlock":
      return { domain: "lock", service: "unlock", serviceData: base };
    case "media.play":
      return { domain: "media_player", service: "media_play", serviceData: base };
    case "media.pause":
      return { domain: "media_player", service: "media_pause", serviceData: base };
    case "media.volume.set":
      return typeof p.percent === "number" && p.percent >= 0 && p.percent <= 100
        ? { domain: "media_player", service: "volume_set", serviceData: { ...base, volume_level: p.percent / 100 } } : null;
    default:
      return null;
  }
}
