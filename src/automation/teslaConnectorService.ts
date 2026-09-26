import type { TeslaConnectorClient, TeslaClientResult } from "./connectorAdapters";

export type TeslaConnectorStatus =
  | {
      ok: true;
      connected: boolean;
      ready: boolean;
      vehicleCount: number;
      pairedVehicleCount: number;
      pairingUrl?: string;
      message: string;
    }
  | { ok: false; code: string; message: string };

export type TeslaAuthorizationResult =
  | { ok: true; url: string }
  | { ok: false; code: string; message: string };

export type TeslaNativeExecutionGrant =
  | { ok: true; endpoint: string; token: string; expiresAt: string }
  | { ok: false; code: string; message: string };

export type TeslaConnectorService = TeslaConnectorClient & {
  authorizationUrl(): Promise<TeslaAuthorizationResult>;
  status(): Promise<TeslaConnectorStatus>;
  nativeExecutionGrant(): Promise<TeslaNativeExecutionGrant>;
  disconnect(): Promise<TeslaClientResult>;
};

export type TeslaConnectorServiceConfig = {
  supabaseUrl: string;
  publishableKey: string;
  getAccessToken: () => Promise<string | null>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

type ServiceEnvelope = Record<string, unknown> & {
  ok?: boolean;
  code?: string;
  message?: string;
};

export function createTeslaConnectorService(config: TeslaConnectorServiceConfig): TeslaConnectorService {
  const endpoint = `${config.supabaseUrl.replace(/\/$/, "")}/functions/v1/tesla-connector`;

  async function request(body: Record<string, unknown>): Promise<ServiceEnvelope> {
    const token = await config.getAccessToken();
    if (!token) return { ok: false, code: "NOT_AUTHENTICATED", message: "Bitte melde dich erneut an." };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 20_000);
    try {
      const response = await (config.fetcher ?? fetch)(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: config.publishableKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => null) as ServiceEnvelope | null;
      if (!payload) return { ok: false, code: "INVALID_CONNECTOR_RESPONSE", message: "Tesla hat keine verwertbare Antwort geliefert." };
      if (!response.ok || payload.ok !== true) {
        return {
          ok: false,
          code: typeof payload.code === "string" ? payload.code : "TESLA_CONNECTOR_FAILED",
          message: typeof payload.message === "string" ? payload.message : "Die Tesla-Verbindung ist fehlgeschlagen."
        };
      }
      return payload;
    } catch (error) {
      return {
        ok: false,
        code: error instanceof Error && error.name === "AbortError" ? "TESLA_CONNECTOR_TIMEOUT" : "TESLA_CONNECTOR_UNREACHABLE",
        message: error instanceof Error && error.name === "AbortError"
          ? "Die Tesla-Verbindung hat zu lange gebraucht."
          : "Der sichere Tesla-Connector ist gerade nicht erreichbar."
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async function execute(operation: "vehicle.lock" | "vehicle.unlock" | "vehicle.rear-trunk.close", vehicle?: string): Promise<TeslaClientResult> {
    const payload = await request({ action: "execute", operation, ...(vehicle ? { vehicle } : {}) });
    return payload.ok === true
      ? { ok: true, ...(typeof payload.message === "string" ? { message: payload.message } : {}) }
      : {
          ok: false,
          code: typeof payload.code === "string" ? payload.code : "TESLA_COMMAND_FAILED",
          message: typeof payload.message === "string" ? payload.message : "Tesla hat den Befehl nicht bestätigt."
        };
  }

  return {
    async authorizationUrl() {
      const payload = await request({ action: "authorize" });
      if (payload.ok === true && typeof payload.url === "string") return { ok: true, url: payload.url };
      return {
        ok: false,
        code: typeof payload.code === "string" ? payload.code : "TESLA_AUTH_FAILED",
        message: typeof payload.message === "string" ? payload.message : "Die Tesla-Anmeldung konnte nicht gestartet werden."
      };
    },
    async status() {
      const payload = await request({ action: "status" });
      if (payload.ok !== true) {
        return {
          ok: false,
          code: typeof payload.code === "string" ? payload.code : "TESLA_STATUS_FAILED",
          message: typeof payload.message === "string" ? payload.message : "Der Tesla-Status konnte nicht geprüft werden."
        };
      }
      return {
        ok: true,
        connected: payload.connected === true,
        ready: payload.ready === true,
        vehicleCount: typeof payload.vehicleCount === "number" ? payload.vehicleCount : 0,
        pairedVehicleCount: typeof payload.pairedVehicleCount === "number" ? payload.pairedVehicleCount : 0,
        ...(typeof payload.pairingUrl === "string" ? { pairingUrl: payload.pairingUrl } : {}),
        message: typeof payload.message === "string" ? payload.message : "Tesla-Verbindung geprüft."
      };
    },
    async nativeExecutionGrant() {
      const payload = await request({ action: "native-grant" });
      if (
        payload.ok === true &&
        typeof payload.endpoint === "string" &&
        typeof payload.token === "string" &&
        typeof payload.expiresAt === "string"
      ) {
        return { ok: true, endpoint: payload.endpoint, token: payload.token, expiresAt: payload.expiresAt };
      }
      return {
        ok: false,
        code: typeof payload.code === "string" ? payload.code : "TESLA_NATIVE_GRANT_FAILED",
        message: typeof payload.message === "string" ? payload.message : "Der sichere Tesla-Hintergrundzugang konnte nicht erstellt werden."
      };
    },
    async disconnect() {
      const payload = await request({ action: "disconnect" });
      return payload.ok === true
        ? { ok: true, ...(typeof payload.message === "string" ? { message: payload.message } : {}) }
        : {
            ok: false,
            code: typeof payload.code === "string" ? payload.code : "TESLA_DISCONNECT_FAILED",
            message: typeof payload.message === "string" ? payload.message : "Die Tesla-Verbindung konnte nicht entfernt werden."
          };
    },
    lockVehicle: (vehicle) => execute("vehicle.lock", vehicle),
    unlockVehicle: (vehicle) => execute("vehicle.unlock", vehicle),
    closeRearTrunk: (vehicle) => execute("vehicle.rear-trunk.close", vehicle)
  };
}
