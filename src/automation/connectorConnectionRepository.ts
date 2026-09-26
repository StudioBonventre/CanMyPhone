import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EMPTY_CONNECTOR_CONNECTION_PROFILE,
  validateConnectorConnectionProfile,
  type ConnectorConnectionProfile,
  type ConnectorConnectionRecord
} from "./connectorConnectionState";

const KEY = "canmyphone.connector-connections.v1";

export async function loadConnectorConnections(): Promise<ConnectorConnectionProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_CONNECTOR_CONNECTION_PROFILE;
    const parsed = JSON.parse(raw) as unknown;
    return validateConnectorConnectionProfile(parsed) ? parsed : EMPTY_CONNECTOR_CONNECTION_PROFILE;
  } catch {
    return EMPTY_CONNECTOR_CONNECTION_PROFILE;
  }
}

export async function saveConnectorConnections(profile: ConnectorConnectionProfile): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}

export async function saveConnectorConnection(record: ConnectorConnectionRecord): Promise<ConnectorConnectionProfile> {
  const current = await loadConnectorConnections();
  const next: ConnectorConnectionProfile = {
    version: 1,
    connections: [...current.connections.filter((item) => item.providerId !== record.providerId), record]
  };
  await saveConnectorConnections(next);
  return next;
}
