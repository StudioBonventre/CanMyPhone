import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultConnectorRegistry } from "../src/automation/builtinConnectorManifests";
import { compileVerifiedGoal, acceptServerPlannerOutput } from "../src/automation/planner";
import { createTeslaRearTrunkPlan } from "../src/automation/teslaPlan";
import { executeValidatedPlan } from "../src/automation/execution";

test("legacy templates and execution cannot bypass registry revocation", async () => {
  const registry = createDefaultConnectorRegistry();
  registry.disableProvider("tesla");
  assert.equal(compileVerifiedGoal("Wenn ich mich vom Tesla entferne, schließe den Heckkofferraum", registry).ok, false);
  assert.equal(acceptServerPlannerOutput(createTeslaRearTrunkPlan(), registry).ok, false);
  let calls = 0;
  const result = await executeValidatedPlan(createTeslaRearTrunkPlan(), { execute: async () => { calls++; return { ok: true, confirmed: true }; } }, true, registry);
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});
import { ProviderConnectorRegistry, canPromoteConnector } from "../src/automation/providerConnectorRegistry";
import { bindProvider } from "../src/automation/providerRegistry";
import { ConnectorRuntime } from "../src/automation/connectorRuntime";
import { connectorPlanForDefinition } from "../src/automation/connectorPlanning";
import { installationPlanForDefinition } from "../src/automation/installationPlan";
import { acceptSemanticAutomationOutput } from "../src/automation/semanticInterpreter";
import { resolveConnectedProviders } from "../src/automation/providerResolution";
import { registryPlanningContext } from "../src/automation/registryPlanningContext";
import { devicesFromHomeKit, devicesFromHomematic } from "../src/automation/deviceDiscovery";
import { readyManifest } from "./helpers/connectorFixture";
const observedAt = new Date().toISOString();

test("built-in universal capabilities and legacy aliases use the same registry", () => {
  const registry = createDefaultConnectorRegistry();
  for (const id of ["apple-home", "tesla", "homematic-ip"]) assert.ok(registry.listReadyProviders().some(p => p.providerId === id));
  assert.equal(registry.getProvider("apple-home")?.kind, "ECOSYSTEM");
  assert.equal(registry.executable("tesla", "vehicle.trunk.close"), true);
  assert.equal(registry.executable("tesla", "tesla.rear-trunk.close"), true);
  assert.equal(registry.executable("matter", "cover.open"), false);
  registry.disableProvider("homematic-ip");
  assert.equal(bindProvider("cover.open", { provider: "homematic-ip" }, new Set(["homematic-ip"]), registry).status, "NOT_IMPLEMENTED");
});

test("multiple paths prefer local verified capability and respect explicit preference", () => {
  const local = { ...readyManifest("local"), kind: "ECOSYSTEM" as const, transport: "LOCAL_REST", localNetworkRequired: true };
  const cloud = readyManifest("cloud");
  const registry = new ProviderConnectorRegistry([local, cloud], new Set(["local", "cloud"]));
  registry.setDevices([{ deviceId: "lamp", providerId: "local", name: "Stehlampe", room: "Wohnzimmer", capabilities: ["light.brightness.set"], observedAt,
    paths: [
      { providerId: "cloud", providerDeviceId: "cloud-lamp", capabilities: ["light.brightness.set"], online: true, observedAt, reliability: 1 },
      { providerId: "local", providerDeviceId: "local-lamp", capabilities: ["light.brightness.set"], online: true, observedAt, reliability: 0.9 }
    ] }]);
  const route = registry.resolveCapability({ capabilityId: "light.brightness.set", deviceId: "lamp" });
  assert.equal(route.status, "READY");
  if (route.status === "READY") { assert.equal(route.path.providerId, "local"); assert.deepEqual(route.path.fallbackProviders, ["cloud"]); }
  const preferred = registry.resolveCapability({ capabilityId: "light.brightness.set", deviceId: "lamp", preferredProviderId: "cloud" });
  assert.equal(preferred.status === "READY" && preferred.path.providerId, "cloud");
  assert.equal(registry.resolveCapability({ capabilityId: "light.brightness.set", deviceName: "local-lamp" }).status, "READY");
  registry.disableProvider("cloud");
  const blockedPreference = registry.resolveCapability({ capabilityId: "light.brightness.set", deviceId: "lamp", preferredProviderId: "cloud" });
  assert.equal(blockedPreference.status === "READY" && blockedPreference.path.providerId, "local");
});

test("provider brightness support does not confer brightness on a switch-only device", async () => {
  const registry = createDefaultConnectorRegistry();
  registry.setDevices([{ deviceId: "switch", providerId: "homematic-ip", name: "Lampe", room: "Büro", capabilities: ["light.power.set"], observedAt }]);
  assert.equal(bindProvider("light.brightness.set", { provider: "homematic-ip", device: "switch" }, new Set(["homematic-ip"]), registry).status, "DEVICE_CAPABILITY_MISMATCH");
  let calls = 0;
  const runtime = new ConnectorRuntime([{ providerId: "homematic-ip", execute: async () => { calls++; return { ok: true, confirmed: true, providerId: "homematic-ip" }; } }], registry);
  const result = await runtime.execute({ automationId: "a", providerId: "homematic-ip", capabilityId: "light.brightness.set", parameters: { room: "Büro", device: "switch", percent: 20 } });
  assert.equal(result.ok, false); assert.equal(calls, 0);
});

test("unknown provider produces actionable discovery request through planner and installation", () => {
  const registry = createDefaultConnectorRegistry();
  const parsed = acceptSemanticAutomationOutput("Roborock starten", JSON.stringify({ kind: "automation", confidence: 0.95, trigger: { capabilityId: "trigger.manual", parameters: {} }, actions: [{ capabilityId: "appliance.program.start", parameters: { provider: "Roborock", program: "clean" } }], clarificationQuestion: null, suggestion: null }));
  assert.equal(parsed.kind, "understood"); if (parsed.kind !== "understood") return;
  const connectors = connectorPlanForDefinition(parsed.definition, new Set(), registry);
  assert.equal(connectors.discoveryRequired, true);
  assert.equal(connectors.discoveryRequests[0].providerName, "Roborock");
  assert.deepEqual(connectors.discoveryRequests[0].requestedCapabilities, ["appliance.program.start"]);
  assert.equal(installationPlanForDefinition(parsed.definition, new Set(), registry).status, "DISCOVERY_REQUIRED");
});

test("unrecognized brand reuses a known device ecosystem path", () => {
  const registry = createDefaultConnectorRegistry();
  registry.setDevices([{ deviceId: "lamp", name: "Stehlampe", providerId: "apple-home", capabilities: ["light.brightness.set"], room: "Wohnzimmer", observedAt }]);
  const binding = bindProvider("light.brightness.set", { brand: "UnknownBrand", device: "Stehlampe" }, new Set(["apple-home"]), registry);
  assert.equal(binding.status, "BOUND");
  if (binding.status === "BOUND") assert.equal(binding.provider.id, "apple-home");
});

test("commercial status and provenance are execution gates, not confidence hints", async () => {
  const m = readyManifest();
  for (const status of ["UNKNOWN", "PERSONAL_USE_ONLY", "PARTNER_APPROVAL_REQUIRED", "BLOCKED"] as const) {
    assert.equal(canPromoteConnector({ ...m, commercialUseStatus: status, confidence: 0.999 }, new Set([m.providerId])), false);
  }
  assert.equal(canPromoteConnector({ ...m, actions: m.actions.map(a => ({ ...a, sourceUrls: [] })) }, new Set([m.providerId])), false);
  assert.equal(canPromoteConnector({ ...m, documentationSources: m.documentationSources.map(s => ({ ...s, providerOwned: false })) }, new Set([m.providerId])), false);
  const registry = new ProviderConnectorRegistry([{ ...m, lifecycle: "CANDIDATE", commercialUseStatus: "BLOCKED" }], new Set([m.providerId]));
  let calls = 0;
  const runtime = new ConnectorRuntime([{ providerId: m.providerId, execute: async () => { calls++; return { ok: true, confirmed: true, providerId: m.providerId }; } }], registry);
  assert.equal((await runtime.execute({ automationId: "a", providerId: m.providerId, capabilityId: "light.brightness.set", parameters: { percent: 20 } })).ok, false);
  assert.equal(calls, 0);
});

test("default runtime requires approval for built-in sensitive actions too", async () => {
  let calls = 0;
  const runtime = new ConnectorRuntime([{ providerId: "tesla", execute: async () => { calls++; return { ok: true, confirmed: true, providerId: "tesla" }; } }]);
  const result = await runtime.execute({ automationId: "a", providerId: "tesla", capabilityId: "vehicle.lock", parameters: { brand: "Tesla" } });
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.code, "CONFIRMATION_REQUIRED"); assert.equal(calls, 0);
});

test("candidate promotion follows lifecycle and rejects forged verification fields", () => {
  const registry = new ProviderConnectorRegistry([], new Set(["example"]));
  const candidate = registry.discover("example", "Example");
  const ready = readyManifest();
  assert.throws(() => registry.promoteCandidate("example", ready), /TRANSITION/);
  let version = candidate.connectorVersion;
  for (const lifecycle of ["CANDIDATE", "VALIDATING", "VERIFIED", "READY"] as const) registry.promoteCandidate("example", { ...ready, lifecycle, connectorVersion: ++version });
  assert.equal(registry.executable("example", "light.brightness.set"), true);
});

test("local planner context and device resolution use discovered inventory", () => {
  const registry = createDefaultConnectorRegistry();
  registry.setDevices([{ deviceId: "lamp", providerId: "apple-home", name: "Stehlampe", room: "Wohnzimmer", capabilities: ["light.brightness.set"], observedAt }]);
  const parsed = acceptSemanticAutomationOutput("Stehlampe dimmen", JSON.stringify({ kind: "automation", confidence: 0.95, trigger: { capabilityId: "trigger.manual", parameters: {} }, actions: [{ capabilityId: "light.brightness.set", parameters: { device: "Stehlampe", percent: 20 } }], clarificationQuestion: null, suggestion: null }));
  assert.equal(parsed.kind, "understood"); if (parsed.kind !== "understood") return;
  const resolved = resolveConnectedProviders(parsed.definition, new Set(["apple-home"]), registry);
  assert.equal(resolved.actions[0].parameters.provider, "apple-home");
  assert.equal(resolved.actions[0].parameters.room, "Wohnzimmer");
  assert.equal(registryPlanningContext(["apple-home"], registry).devices[0].name, "Stehlampe");
});

test("device discovery does not invent brightness from brand or old native builds", () => {
  const home = devicesFromHomeKit({ authorized: true, determined: true, restricted: false, message: "", homes: [{ id: "home", name: "Home", primary: true, rooms: [{ id: "room", name: "Room", accessories: [{ id: "switch", name: "Switch", reachable: true, characteristics: ["brightness"] }] }] }] });
  assert.deepEqual(home[0].capabilities, []);
  const hm = devicesFromHomematic({ devices: [{ id: "switch", label: "Switch", functionalChannels: [{ index: 1, functionalChannelType: "SWITCH" }] }], groups: [] });
  assert.deepEqual(hm[0].capabilities, ["light.power.set"]);
});
