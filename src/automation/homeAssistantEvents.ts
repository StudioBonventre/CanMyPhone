import type { DiscoveredDevice } from "./providerConnectorRegistry";
import type { NormalizedProviderEvent } from "./providerEventDispatch";
import { homeAssistantCapabilitiesForState, type HomeAssistantState } from "./homeAssistantModel";

const CONTACT_CLASSES = new Set(["door", "garage_door", "opening", "window"]);
const MOTION_CLASSES = new Set(["motion", "occupancy"]);

export type HomeAssistantStateChangedEnvelope = {
  type: "event";
  event: {
    event_type: "state_changed";
    time_fired: string;
    data: {
      entity_id: string;
      old_state?: HomeAssistantState | null;
      new_state?: HomeAssistantState | null;
    };
    context?: { id?: string | null };
  };
};

export function normalizeHomeAssistantStateChangedEvent(
  envelope: HomeAssistantStateChangedEnvelope,
  installationId: string,
  receivedAt: string,
  entity?: DiscoveredDevice
): NormalizedProviderEvent | null {
  if (!installationId.trim() || !Number.isFinite(Date.parse(receivedAt))) return null;
  if (envelope?.event?.event_type !== "state_changed" || !Number.isFinite(Date.parse(envelope.event.time_fired))) return null;

  const next = envelope.event.data.new_state;
  if (!next || next.entity_id !== envelope.event.data.entity_id) return null;

  const capabilities = homeAssistantCapabilitiesForState(next);
  const domain = next.entity_id.split(".", 1)[0] ?? "";
  let capabilityId: string | undefined;
  let value: string | number | boolean | undefined;

  if (domain === "binary_sensor") {
    const deviceClass = typeof next.attributes.device_class === "string" ? next.attributes.device_class : "";
    if (MOTION_CLASSES.has(deviceClass)) capabilityId = "sensor.motion.changed";
    else if (CONTACT_CLASSES.has(deviceClass)) capabilityId = "sensor.contact.changed";
    if (capabilityId) value = next.state === "on";
  } else if (domain === "sensor" && next.attributes.device_class === "temperature") {
    const parsed = Number(next.state);
    if (Number.isFinite(parsed)) {
      capabilityId = "sensor.temperature.changed";
      value = parsed;
    }
  }

  if (!capabilityId || !capabilities.includes(capabilityId) || value === undefined) return null;

  const eventId =
    envelope.event.context?.id ||
    next.context?.id ||
    `${next.entity_id}:${envelope.event.time_fired}:${String(value)}`;

  return {
    eventId,
    providerId: "home-assistant",
    installationId,
    deviceId: next.entity_id,
    deviceName: entity?.name,
    room: entity?.room,
    capabilityId,
    eventType: capabilityId,
    normalizedPayload: { value },
    occurredAt: envelope.event.time_fired,
    receivedAt,
    verification: {
      verified: true,
      method: "WEBSOCKET_SESSION",
      verifiedAt: receivedAt
    }
  };
}
