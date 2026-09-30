import type { AutomationPlan } from "./types";

export function createTeslaRearTrunkPlan(): AutomationPlan {
  return {
    version: 1,
    id: "tesla-rear-trunk-geofence-v1",
    title: "Heckkofferraum beim Entfernen schließen",
    explanation: [
      "iOS überwacht nach deiner Standortfreigabe einen Geofence um den geparkten Tesla.",
      "CanMyPhone prüft serverseitig zuerst, ob das Fahrzeug erreichbar und der hintere Kofferraum eindeutig offen ist.",
      "Nur dann wird der offizielle, signierte Tesla-Befehl gesendet. Ein unklarer Zustand führt nie zu einem blinden Umschalten."
    ],
    triggers: [{
      id: "leave-vehicle-area",
      kind: "geofence-exit",
      capabilityId: "ios.core-location.geofence-exit",
      parameters: { radiusMeters: 200, centerSource: "parked-vehicle-location" }
    }],
    conditions: [
      { id: "tesla-authorized", kind: "authorization", capabilityId: "tesla.fleet-api.vehicle-state", parameters: { scopes: ["vehicle_device_data", "vehicle_cmds"] } },
      { id: "rear-trunk-open", kind: "vehicle-state", capabilityId: "tesla.fleet-api.vehicle-state", parameters: { field: "rt", equals: 1 } },
      { id: "pro-active", kind: "entitlement", capabilityId: "tesla.fleet-api.actuate-rear-trunk", parameters: { product: "pro" } }
    ],
    actions: [{
      id: "close-rear-trunk",
      kind: "tesla-command",
      capabilityId: "tesla.fleet-api.actuate-rear-trunk",
      parameters: { endpoint: "actuate_trunk", whichTrunk: "rear", expectedPriorState: "open" },
      sensitive: true
    }],
    authorizations: [
      { id: "ios-location", provider: "ios", kind: "location-always", reason: "Den Bereich um dein geparktes Fahrzeug beim Verlassen erkennen.", oneTime: true },
      { id: "tesla-oauth", provider: "tesla", kind: "oauth", reason: "Fahrzeugstatus lesen und freigegebene Fahrzeugbefehle senden.", oneTime: true },
      { id: "tesla-key", provider: "tesla", kind: "virtual-key", reason: "Befehle Ende-zu-Ende signieren und am Fahrzeug autorisieren.", oneTime: true },
      { id: "enable-confirmation", provider: "canmyphone", kind: "explicit-confirmation", reason: "Die sensible Fahrzeugautomation aktivieren.", oneTime: true }
    ],
    executionMode: "server",
    riskLevel: "high",
    fallbacks: [
      { id: "unknown-state", when: "rear trunk state is unknown", mode: "abort", message: "Nicht ausgeführt: Der Kofferraumzustand ist unklar." },
      { id: "vehicle-asleep", when: "vehicle is asleep", mode: "confirm", message: "Fahrzeug aufwecken und danach erneut prüfen?" },
      { id: "command-failed", when: "Tesla rejects or times out", mode: "notify", message: "Der Kofferraum wurde nicht als geschlossen bestätigt." }
    ],
    requiresPro: true,
    status: "preview",
    capabilityIds: [
      "ios.core-location.geofence-exit",
      "tesla.fleet-api.vehicle-state",
      "tesla.fleet-api.actuate-rear-trunk"
    ],
    confirmationRequired: true
  };
}
