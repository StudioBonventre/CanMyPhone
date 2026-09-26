export const HOMEMATIC_CONNECT_API_VERSION = "12";
export const HOMEMATIC_PLUGIN_ID = "com.studiobonventre.canmyphone";
export const HOMEMATIC_PLUGIN_NAME = { de: "CanMyPhone", en: "CanMyPhone" } as const;

export const HMIP_PATHS = {
  stateForClient: "/hmip/home/getStateForClient",
  setShutterLevel: "/hmip/device/control/setShutterLevel",
  setSwitchState: "/hmip/device/control/setSwitchState",
  setDimLevel: "/hmip/device/control/setDimLevel",
  setSetPointTemperature: "/hmip/group/heating/setSetPointTemperature"
} as const;

export type HomematicSystemRequest = {
  id: string;
  type: "HMIP_SYSTEM_REQUEST";
  pluginId: string;
  body: {
    path: string;
    body: Record<string, string | number | boolean>;
  };
};

export type HomematicChannel = {
  index: number;
  functionalChannelType?: string;
  groups?: string[];
};

export type HomematicDevice = {
  id: string;
  label?: string;
  functionalChannels: HomematicChannel[];
};

export type HomematicGroupChannel = {
  deviceId: string;
  channelIndex: number;
};

export type HomematicGroup = {
  id: string;
  label?: string;
  type?: string;
  metaGroupId?: string;
  channels: HomematicGroupChannel[];
};

export type HomematicState = {
  devices: HomematicDevice[];
  groups: HomematicGroup[];
};

export type HomematicTarget =
  | { kind: "device-channel"; deviceId: string; channelIndex: number }
  | { kind: "heating-group"; groupId: string };

export function homematicHcuHost(lastFourSgtinDigits: string): string {
  const suffix = lastFourSgtinDigits.trim();
  if (!/^[A-Za-z0-9]{4}$/.test(suffix)) throw new Error("HOMEMATIC_SGTIN_SUFFIX_INVALID");
  return `hcu1-${suffix.toUpperCase()}.local`;
}

export function homematicPairingURL(host: string, action: "request" | "confirm"): string {
  if (!/^hcu1-[A-Za-z0-9]{4}\.local$/i.test(host)) throw new Error("HOMEMATIC_HCU_HOST_INVALID");
  const path = action === "request"
    ? "/hmip/auth/requestConnectApiAuthToken"
    : "/hmip/auth/confirmConnectApiAuthToken";
  return `https://${host}:6969${path}`;
}

export function homematicPairingHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    VERSION: HOMEMATIC_CONNECT_API_VERSION
  };
}

export function homematicRequestTokenBody(
  activationKey: string,
  friendlyName: { de: string; en: string } = HOMEMATIC_PLUGIN_NAME,
  pluginId = HOMEMATIC_PLUGIN_ID
) {
  const key = activationKey.trim();
  if (!key) throw new Error("HOMEMATIC_ACTIVATION_KEY_REQUIRED");
  return { activationKey: key, pluginId, friendlyName };
}

export function homematicConfirmTokenBody(activationKey: string, authToken: string) {
  const key = activationKey.trim();
  const token = authToken.trim();
  if (!key) throw new Error("HOMEMATIC_ACTIVATION_KEY_REQUIRED");
  if (!token) throw new Error("HOMEMATIC_AUTH_TOKEN_REQUIRED");
  return { activationKey: key, authToken: token };
}

export function homematicWebSocketURL(host: string): string {
  if (!/^hcu1-[A-Za-z0-9]{4}\.local$/i.test(host)) throw new Error("HOMEMATIC_HCU_HOST_INVALID");
  return `wss://${host}:9001`;
}

export function homematicWebSocketHeaders(authToken: string, pluginId = HOMEMATIC_PLUGIN_ID): Record<string, string> {
  const token = authToken.trim();
  if (!token) throw new Error("HOMEMATIC_AUTH_TOKEN_REQUIRED");
  return {
    authtoken: token,
    "plugin-id": pluginId,
    "hmip-system-events": "true"
  };
}

export function homematicSystemRequest(
  id: string,
  path: string,
  body: Record<string, string | number | boolean> = {},
  pluginId = HOMEMATIC_PLUGIN_ID
): HomematicSystemRequest {
  if (!id.trim()) throw new Error("HOMEMATIC_REQUEST_ID_REQUIRED");
  if (!path.startsWith("/hmip/")) throw new Error("HOMEMATIC_PATH_NOT_ALLOWLISTED");
  const allowed = new Set<string>(Object.values(HMIP_PATHS));
  if (!allowed.has(path)) throw new Error("HOMEMATIC_PATH_NOT_ALLOWLISTED");
  return { id, type: "HMIP_SYSTEM_REQUEST", pluginId, body: { path, body } };
}

function normalize(value?: string): string {
  return (value ?? "").trim().toLocaleLowerCase("de-DE").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function values<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === "object") return Object.values(input as Record<string, T>);
  return [];
}

function safeChannel(value: unknown): HomematicChannel | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.index !== "number") return null;
  return {
    index: raw.index,
    ...(typeof raw.functionalChannelType === "string" ? { functionalChannelType: raw.functionalChannelType } : {}),
    ...(Array.isArray(raw.groups) && raw.groups.every((item) => typeof item === "string") ? { groups: raw.groups as string[] } : {})
  };
}

function safeDevice(value: unknown): HomematicDevice | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    ...(typeof raw.label === "string" ? { label: raw.label } : {}),
    functionalChannels: values<unknown>(raw.functionalChannels).map(safeChannel).filter((item): item is HomematicChannel => Boolean(item))
  };
}

function safeGroupChannel(value: unknown): HomematicGroupChannel | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.deviceId !== "string" || typeof raw.channelIndex !== "number") return null;
  return { deviceId: raw.deviceId, channelIndex: raw.channelIndex };
}

function safeGroup(value: unknown): HomematicGroup | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    ...(typeof raw.label === "string" ? { label: raw.label } : {}),
    ...(typeof raw.type === "string" ? { type: raw.type } : {}),
    ...(typeof raw.metaGroupId === "string" ? { metaGroupId: raw.metaGroupId } : {}),
    channels: values<unknown>(raw.channels).map(safeGroupChannel).filter((item): item is HomematicGroupChannel => Boolean(item))
  };
}

export function parseHomematicState(value: unknown): HomematicState | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const devices = values<unknown>(raw.devices).map(safeDevice).filter((item): item is HomematicDevice => Boolean(item));
  const groups = values<unknown>(raw.groups).map(safeGroup).filter((item): item is HomematicGroup => Boolean(item));
  if (!devices.length && !groups.length) return null;
  return { devices, groups };
}

function roomMetaGroup(state: HomematicState, room: string): HomematicGroup | null {
  const query = normalize(room);
  const exact = state.groups.filter((group) => normalize(group.label) === query);
  const meta = exact.filter((group) => normalize(group.type) === "meta");
  if (meta.length === 1) return meta[0]!;
  if (exact.length === 1) return exact[0]!;
  return null;
}

function devicesInRoom(state: HomematicState, room: string, device?: string): HomematicDevice[] {
  const group = roomMetaGroup(state, room);
  if (!group) return [];
  const ids = new Set(group.channels.map((channel) => channel.deviceId));
  let matches = state.devices.filter((item) => ids.has(item.id));
  if (device?.trim()) {
    const target = normalize(device);
    matches = matches.filter((item) => normalize(item.label) === target || normalize(item.label).includes(target));
  }
  return matches;
}

const COVER_CHANNEL = /(shutter|blind|shading|jalousie)/i;
const LIGHT_CHANNEL = /(dimmer|switch|light)/i;

export function resolveHomematicCoverTargets(state: HomematicState, room: string, device?: string): HomematicTarget[] {
  return devicesInRoom(state, room, device).flatMap((item) =>
    item.functionalChannels
      .filter((channel) => COVER_CHANNEL.test(channel.functionalChannelType ?? ""))
      .map((channel) => ({ kind: "device-channel", deviceId: item.id, channelIndex: channel.index } as const))
  );
}

export function resolveHomematicLightTargets(state: HomematicState, room: string, device?: string): HomematicTarget[] {
  return devicesInRoom(state, room, device).flatMap((item) =>
    item.functionalChannels
      .filter((channel) => LIGHT_CHANNEL.test(channel.functionalChannelType ?? ""))
      .map((channel) => ({ kind: "device-channel", deviceId: item.id, channelIndex: channel.index } as const))
  );
}

export function resolveHomematicHeatingTarget(state: HomematicState, room: string): HomematicTarget | null {
  const meta = roomMetaGroup(state, room);
  if (!meta) return null;
  const heating = state.groups.filter((group) =>
    normalize(group.type) === "heating" &&
    (group.metaGroupId === meta.id || normalize(group.label) === normalize(room))
  );
  if (heating.length !== 1) return null;
  return { kind: "heating-group", groupId: heating[0]!.id };
}

export function buildHomematicCoverCommand(target: HomematicTarget, open: boolean) {
  if (target.kind !== "device-channel") throw new Error("HOMEMATIC_DEVICE_TARGET_REQUIRED");
  return {
    path: HMIP_PATHS.setShutterLevel,
    body: {
      deviceId: target.deviceId,
      channelIndex: target.channelIndex,
      shutterLevel: open ? 0 : 1
    }
  };
}

export function buildHomematicLightCommand(target: HomematicTarget, value: string) {
  if (target.kind !== "device-channel") throw new Error("HOMEMATIC_DEVICE_TARGET_REQUIRED");
  const normalized = normalize(value);
  if (["on","an","ein","true"].includes(normalized)) {
    return { path: HMIP_PATHS.setSwitchState, body: { deviceId: target.deviceId, channelIndex: target.channelIndex, on: true } };
  }
  if (["off","aus","false"].includes(normalized)) {
    return { path: HMIP_PATHS.setSwitchState, body: { deviceId: target.deviceId, channelIndex: target.channelIndex, on: false } };
  }
  const numeric = Number(normalized.replace("%","").replace(",","."));
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) throw new Error("HOMEMATIC_LIGHT_VALUE_INVALID");
  return { path: HMIP_PATHS.setDimLevel, body: { deviceId: target.deviceId, channelIndex: target.channelIndex, dimLevel: numeric / 100 } };
}

export function buildHomematicClimateCommand(target: HomematicTarget, value: string) {
  if (target.kind !== "heating-group") throw new Error("HOMEMATIC_HEATING_GROUP_REQUIRED");
  const numeric = Number(normalize(value).replace("°c","").replace("grad","").replace(",",".").trim());
  if (!Number.isFinite(numeric) || numeric < 5 || numeric > 30) throw new Error("HOMEMATIC_TEMPERATURE_INVALID");
  return {
    path: HMIP_PATHS.setSetPointTemperature,
    body: { groupId: target.groupId, setPointTemperature: numeric }
  };
}
