import AsyncStorage from "@react-native-async-storage/async-storage";
import { CanMyPhoneNative } from "../../modules/canmyphone-native";
import { connectorRegistry } from "../automation/builtinConnectorManifests";
import { ConnectorRegistryRepository } from "../automation/connectorRegistryRepository";
import { fetchConnectorRegistryRecords } from "./supabasePlanner";
import { devicesFromHomeKit, devicesFromHomematic } from "../automation/deviceDiscovery";
import { connectedProviderIds } from "../automation/connectorConnectionState";
import { loadConnectorConnections } from "../automation/connectorConnectionRepository";
export const connectorRegistryRepository = new ConnectorRegistryRepository(connectorRegistry, AsyncStorage, fetchConnectorRegistryRecords);
export async function refreshConnectorRegistry() {
  const source = await connectorRegistryRepository.refresh();
  await syncNativeConnectorRegistry();
  return source;
}
export async function syncNativeConnectorRegistry() {
  await connectorRegistryRepository.hydrate();
  await CanMyPhoneNative?.syncConnectorRegistry?.(JSON.stringify(connectorRegistry.list().map(m => ({
    providerId: m.providerId, aliases: m.aliases ?? [], version: connectorRegistryRepository.serverVersion(m.providerId) ?? m.connectorVersion,
    expiresAt: connectorRegistry.providerExpiry(m.providerId),
    status: m.lifecycle, commercialStatus: m.commercialUseStatus,
    capabilities: m.actions.filter(a => connectorRegistry.executable(m.providerId, a.capabilityId)).map(a => a.capabilityId)
  }))));
}
export async function refreshConnectedDeviceInventory() {
  const connected = connectedProviderIds(await loadConnectorConnections());
  const providers = new Set(["apple-home", "homematic-ip"]);
  const discovered = connectorRegistry.getDevices().filter(d => !providers.has(d.providerId));
  if (connected.has("apple-home")) {
    const snapshot = await CanMyPhoneNative?.homeKitSnapshot?.().catch(() => null);
    if (snapshot) discovered.push(...devicesFromHomeKit(snapshot));
  }
  if (connected.has("homematic-ip")) {
    const snapshot = await CanMyPhoneNative?.homematicSnapshot?.().catch(() => null);
    if (snapshot?.success) discovered.push(...devicesFromHomematic(snapshot.state));
  }
  connectorRegistry.setDevices(discovered);
}
