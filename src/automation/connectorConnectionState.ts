export type ConnectorConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export type ConnectorConnectionRecord = {
  providerId: string;
  status: ConnectorConnectionStatus;
  updatedAt: string;
  connectedAt?: string;
  errorCode?: string;
};

export type ConnectorConnectionProfile = {
  version: 1;
  connections: ConnectorConnectionRecord[];
};

export const EMPTY_CONNECTOR_CONNECTION_PROFILE: ConnectorConnectionProfile = {
  version: 1,
  connections: []
};

export function connectionFor(profile: ConnectorConnectionProfile, providerId: string) {
  return profile.connections.find((item) => item.providerId === providerId);
}

export function connectedProviderIds(profile: ConnectorConnectionProfile): Set<string> {
  return new Set(profile.connections.filter((item) => item.status === "CONNECTED").map((item) => item.providerId));
}

export function setConnectorConnection(profile: ConnectorConnectionProfile, record: ConnectorConnectionRecord): ConnectorConnectionProfile {
  return {
    version: 1,
    connections: [...profile.connections.filter((item) => item.providerId !== record.providerId), record]
  };
}

export function validateConnectorConnectionProfile(value: unknown): value is ConnectorConnectionProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<ConnectorConnectionProfile>;
  if (profile.version !== 1 || !Array.isArray(profile.connections)) return false;
  return profile.connections.every((item) =>
    Boolean(item) &&
    typeof item.providerId === "string" &&
    ["DISCONNECTED","CONNECTING","CONNECTED","ERROR"].includes(String(item.status)) &&
    typeof item.updatedAt === "string"
  );
}
