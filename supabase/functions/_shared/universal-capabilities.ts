// Shared by the mobile planner, manifest validator and server semantic validator.
export type UniversalParameter = { type: "string" | "number" | "boolean"; required: boolean; min?: number; max?: number; values?: readonly (string | number | boolean)[] };
export type UniversalCapability = { id: string; role: "action" | "trigger"; risk: "low" | "medium" | "high"; parameters: Record<string, UniversalParameter> };
const target: Record<string, UniversalParameter> = Object.fromEntries(["provider", "brand", "device", "room", "vehicle"].map(key => [key, { type: "string", required: false }]));
const number = (min?: number, max?: number): UniversalParameter => ({ type: "number", required: true, min, max });
const string: UniversalParameter = { type: "string", required: true };
const action = (id: string, parameters: Record<string, UniversalParameter> = {}, risk: UniversalCapability["risk"] = "low"): UniversalCapability => ({ id, role: "action", risk, parameters: { ...target, ...parameters } });
const event = (id: string): UniversalCapability => ({ id, role: "trigger", risk: "medium", parameters: { ...target, ...(["sensor.motion.changed", "sensor.contact.changed"].includes(id) ? { value: { type: "boolean" as const, required: true } } : {}) } });
export const UNIVERSAL_CAPABILITIES: readonly UniversalCapability[] = [
  action("light.power.set", { on: { type: "boolean", required: true } }),
  action("light.brightness.set", { percent: number(0, 100) }),
  action("light.color.set", { color: string }),
  action("light.color-temperature.set", { kelvin: number(1000, 10000) }),
  action("switch.power.set", { on: { type: "boolean", required: true } }),
  action("cover.open", {}, "medium"), action("cover.close", {}, "medium"), action("cover.position.set", { percent: number(0, 100) }, "medium"),
  action("climate.temperature.set", { celsius: number(5, 35) }, "medium"), action("climate.mode.set", { mode: string }, "medium"),
  action("lock.lock", {}, "high"), action("lock.unlock", {}, "high"),
  event("sensor.motion.changed"), event("sensor.contact.changed"), event("sensor.temperature.changed"),
  action("vehicle.lock", {}, "high"), action("vehicle.unlock", {}, "high"),
  action("vehicle.trunk.close", { expectedState: { type: "string", required: false, values: ["open"] } }, "high"), action("vehicle.state.read"),
  action("energy.production.read"), action("energy.consumption.read"),
  action("charger.start", {}, "medium"), action("charger.stop", {}, "medium"), action("charger.current.set", { amperes: number(0, 80) }, "medium"), action("charger.state.read"),
  action("media.play"), action("media.pause"), action("media.volume.set", { percent: number(0, 100) }), action("media.content.play", { content: string }),
  action("appliance.state.read"), action("appliance.program.start", { program: string }, "high"), event("appliance.finished")
];
export function universalCapability(id: string): UniversalCapability | undefined { return UNIVERSAL_CAPABILITIES.find(item => item.id === id); }
export type CapabilityStep = { capabilityId: string; parameters: Record<string, string | number | boolean> };
export function normalizeConnectorStep(step: CapabilityStep): CapabilityStep {
  const parameters = { ...step.parameters };
  const aliases: Record<string, string> = { "tesla.rear-trunk.close": "vehicle.trunk.close", "vehicle.rear-trunk.close": "vehicle.trunk.close", "smart-home.cover.open": "cover.open", "smart-home.cover.close": "cover.close", "smart-home.climate.set": "climate.temperature.set" };
  let capabilityId = aliases[step.capabilityId] ?? step.capabilityId;
  if (step.capabilityId === "tesla.rear-trunk.close") parameters.provider = "tesla";
  if (step.capabilityId === "smart-home.light.set") {
    const value = String(parameters.value ?? "").trim().toLowerCase();
    if (["on", "off", "an", "aus"].includes(value)) { capabilityId = "light.power.set"; parameters.on = ["on", "an"].includes(value); }
    else if (/^\d+(?:\.\d+)?%?$/.test(value)) { capabilityId = "light.brightness.set"; parameters.percent = Number(value.replace("%", "")); }
    // Invalid legacy values remain unresolvable instead of being silently coerced.
    if (capabilityId !== step.capabilityId) delete parameters.value;
  }
  if (step.capabilityId === "smart-home.climate.set") {
    const value = String(parameters.value ?? "").trim();
    if (/^\d+(?:[.,]\d+)?(?:\s*°?C)?$/i.test(value)) { parameters.celsius = Number(value.replace(/\s*°?C$/i, "").replace(",", ".")); delete parameters.value; }
  }
  return { capabilityId, parameters };
}
