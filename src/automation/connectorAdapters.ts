import type { ConnectorAdapter, ConnectorExecutionResult } from "./connectorRuntime";

type TeslaClientResult = { ok: true } | { ok: false; code: string; message?: string };
export type TeslaConnectorClient = {
  lockVehicle(vehicle?: string): Promise<TeslaClientResult>;
  unlockVehicle(vehicle?: string): Promise<TeslaClientResult>;
};

export function createTeslaConnectorAdapter(client: TeslaConnectorClient): ConnectorAdapter {
  return {
    providerId: "tesla",
    async execute(request): Promise<ConnectorExecutionResult> {
      const vehicle = typeof request.parameters.vehicle === "string" ? request.parameters.vehicle : undefined;
      let result: TeslaClientResult;
      if (request.capabilityId === "vehicle.lock") result = await client.lockVehicle(vehicle);
      else if (request.capabilityId === "vehicle.unlock") result = await client.unlockVehicle(vehicle);
      else {
        return { ok:false, providerId:"tesla", code:"UNSUPPORTED_OPERATION", message:"Diese Tesla-Aktion unterstützt der Connector noch nicht." };
      }
      return result.ok
        ? { ok:true, confirmed:true, providerId:"tesla" }
        : { ok:false, providerId:"tesla", code:result.code, message:result.message ?? "Tesla hat den Befehl nicht bestätigt." };
    }
  };
}

type HomematicClientResult = { ok: true } | { ok: false; code: string; message?: string };
export type HomematicIPConnectorClient = {
  openCover(room: string, device?: string): Promise<HomematicClientResult>;
  closeCover(room: string, device?: string): Promise<HomematicClientResult>;
  setLight(room: string, value: string, device?: string): Promise<HomematicClientResult>;
  setClimate(room: string, value: string, device?: string): Promise<HomematicClientResult>;
};

export function createHomematicIPConnectorAdapter(client: HomematicIPConnectorClient): ConnectorAdapter {
  return {
    providerId: "homematic-ip",
    async execute(request): Promise<ConnectorExecutionResult> {
      const room = typeof request.parameters.room === "string" ? request.parameters.room : "";
      const device = typeof request.parameters.device === "string" ? request.parameters.device : undefined;
      const value = typeof request.parameters.value === "string" ? request.parameters.value : "";
      if (!room) {
        return { ok:false, providerId:"homematic-ip", code:"ROOM_REQUIRED", message:"Für diese Homematic-IP-Aktion fehlt der Raum." };
      }

      let result: HomematicClientResult;
      switch (request.capabilityId) {
        case "smart-home.cover.open":
          result = await client.openCover(room, device);
          break;
        case "smart-home.cover.close":
          result = await client.closeCover(room, device);
          break;
        case "smart-home.light.set":
          result = await client.setLight(room, value, device);
          break;
        case "smart-home.climate.set":
          result = await client.setClimate(room, value, device);
          break;
        default:
          return { ok:false, providerId:"homematic-ip", code:"UNSUPPORTED_OPERATION", message:"Diese Homematic-IP-Aktion unterstützt der Connector noch nicht." };
      }

      return result.ok
        ? { ok:true, confirmed:true, providerId:"homematic-ip" }
        : { ok:false, providerId:"homematic-ip", code:result.code, message:result.message ?? "Homematic IP hat den Befehl nicht bestätigt." };
    }
  };
}
