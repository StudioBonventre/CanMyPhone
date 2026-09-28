import type { HomeKitSnapshotResult } from "../../modules/canmyphone-native/src/CanMyPhoneNative.types";
import type { DiscoveredDevice } from "./providerConnectorRegistry";
import { parseHomematicState } from "./homematicConnectApi";
export function devicesFromHomeKit(snapshot: HomeKitSnapshotResult, at = new Date().toISOString()): DiscoveredDevice[] {
  if (!snapshot.authorized) return [];
  return snapshot.homes.flatMap(home => home.rooms.flatMap(room => room.accessories.map(accessory => ({
    deviceId: accessory.id, providerId: "apple-home", ecosystem: "apple-home", name: accessory.name, room: room.name,
    capabilities: accessory.capabilities ?? [], observedAt: at, online: accessory.reachable, metadata: { homeId: home.id }
  }))));
}
export function devicesFromHomematic(raw: unknown, at = new Date().toISOString()): DiscoveredDevice[] {
  const state = parseHomematicState(raw);
  if (!state) return [];
  const devices: DiscoveredDevice[] = state.devices.map(device => {
    const channels = device.functionalChannels.map(c => c.functionalChannelType ?? "");
    const room = state.groups.find(g => g.type?.toLowerCase() === "meta" && g.channels.some(c => c.deviceId === device.id));
    return { deviceId: device.id, providerId: "homematic-ip", name: device.label, room: room?.label, observedAt: at,
      capabilities: [...(channels.some(c => /shutter|blind|shading|jalousie/i.test(c)) ? ["cover.open", "cover.close"] : []),
        ...(channels.some(c => /switch|dimmer|light/i.test(c)) ? ["light.power.set"] : []),
        ...(channels.some(c => /dimmer/i.test(c)) ? ["light.brightness.set"] : [])] };
  });
  for (const group of state.groups.filter(g => g.type?.toLowerCase() === "heating")) {
    const room = state.groups.find(g => g.id === group.metaGroupId);
    devices.push({ deviceId: group.id, providerId: "homematic-ip", name: group.label, room: room?.label ?? group.label, observedAt: at, deviceClass: "climate", capabilities: ["climate.temperature.set"] });
  }
  return devices;
}
