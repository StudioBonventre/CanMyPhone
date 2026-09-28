import test from "node:test";
import assert from "node:assert/strict";
import { ProviderConnectorRegistry, deviceSupportsOperation, type ProviderConnectorManifest } from "../src/automation/providerConnectorRegistry";
import { ConnectorRuntime } from "../src/automation/connectorRuntime";
import { resolveDeviceCapability } from "../src/automation/capabilityResolver";
import { discoverConnectorPath, DISCOVERY_SEEDS } from "../src/automation/connectorDiscovery";

test("unknown manufacturer is a non-executable legal-review candidate", async () => {
  assert.throws(() => new ConnectorRuntime([{ providerId: "xyz", execute: async () => ({ ok: true, confirmed: true, providerId: "xyz" }) }]), /MANIFEST_REQUIRED/);
  const registry = new ProviderConnectorRegistry([], new Set(["xyz"]));
  const candidate = registry.discover("xyz", "XYZ");
  assert.equal(candidate.lifecycle, "CANDIDATE_LEGAL_REVIEW_REQUIRED");
  assert.equal(registry.discover("xyz", "XYZ again").displayName, "XYZ");
  let calls = 0;
  const runtime = new ConnectorRuntime([{ providerId: "xyz", execute: async () => { calls++; return { ok: true, confirmed: true, providerId: "xyz" }; } }], registry);
  const result = await runtime.execute({ automationId: "a", providerId: "xyz", capabilityId: "light.power.set", parameters: {} });
  assert.equal(result.ok, false);
  assert.equal(calls, 0);
});

test("READY requires every gate, commercial approval and trusted adapter", async () => {
  const candidate = new ProviderConnectorRegistry().discover("xyz", "XYZ");
  const ready: ProviderConnectorManifest = {
    ...candidate, connectorVersion: 2, lifecycle: "READY", commercialUseStatus: "ALLOWED",
    documentationSources: [{ url: "https://developer.example.com/api", kind: "OFFICIAL_DOCS", providerOwned: true, retrievedAt: "2026-09-26", verifiedAt: "2026-09-26" }],
    allowedDomains: ["api.example.com"],
    actions: [{ capabilityId: "light.power.set", inputSchema: { on: "boolean" }, resultSchema: { ok: "boolean" }, risk: "LOW", confirmationRequired: false, sourceUrls: ["https://developer.example.com/api"] }],
    verification: { documentation: true, authentication: true, endpointAllowlist: true, inputSchema: true, outputSchema: true, riskClassification: true, terms: true, connectorTests: true }
  };
  assert.throws(() => new ProviderConnectorRegistry([ready]), /NOT_VERIFIED/);
  assert.throws(() => new ProviderConnectorRegistry([{ ...ready, commercialUseStatus: "UNKNOWN" }], new Set(["xyz"])), /NOT_VERIFIED/);
  assert.throws(() => new ProviderConnectorRegistry([{ ...ready, verification: { ...ready.verification, inputSchema: false } }], new Set(["xyz"])), /NOT_VERIFIED/);
  const registry = new ProviderConnectorRegistry([ready], new Set(["xyz"]));
  assert.equal(registry.executable("xyz", "light.power.set"), true);
  assert.equal(registry.executable("xyz", "light.color.set"), false);
  assert.equal(registry.validateExecution("xyz", "light.power.set", { on: true }), true);
  assert.equal(registry.validateExecution("xyz", "light.power.set", { on: "true" }), false);
  assert.equal(registry.validateExecution("xyz", "light.power.set", { on: true, url: "https://evil.example" }), false);
  const returned = registry.get("xyz")!;
  returned.lifecycle = "BLOCKED";
  assert.equal(registry.get("xyz")?.lifecycle, "READY");
  assert.throws(() => registry.upsert(ready), /VERSION_NOT_NEWER/);
  const sensitive = { ...ready, connectorVersion: 3, actions: [{ ...ready.actions[0]!, risk: "HIGH" as const, confirmationRequired: true }] };
  registry.upsert(sensitive);
  let executed = 0;
  const runtime = new ConnectorRuntime([{ providerId: "xyz", execute: async () => { executed++; return { ok: true, confirmed: true, providerId: "xyz" }; } }], registry);
  const result = await runtime.execute({ automationId: "a", providerId: "xyz", capabilityId: "light.power.set", parameters: { on: true } });
  assert.equal(result.ok, false);
  assert.equal(executed, 0);
});

test("device capabilities are observed, not inferred from manufacturer", () => {
  const device = { providerId: "hue", deviceId: "lamp-1", observedAt: "2026-09-26", capabilities: ["light.power.set", "light.brightness.set"] };
  assert.equal(deviceSupportsOperation(device, "light.brightness.set"), true);
  assert.equal(deviceSupportsOperation(device, "light.color.set"), false);
});

test("resolver uses observed operations and requires a real READY connector", () => {
  const registry = new ProviderConnectorRegistry();
  registry.discover("hue", "Hue");
  const devices = [{ providerId: "hue", deviceId: "lamp-1", observedAt: "2026-09-26", capabilities: ["light.power.set"] }];
  assert.deepEqual(resolveDeviceCapability("light.color.set", devices, registry, "lamp-1"), { status: "UNAVAILABLE", candidates: [] });
  assert.deepEqual(resolveDeviceCapability("light.power.set", devices, registry, "lamp-1"), { status: "UNAVAILABLE", candidates: [] });
});

test("discovery searches beyond seeds but never makes an unknown provider executable", () => {
  const registry = new ProviderConnectorRegistry();
  assert.equal(DISCOVERY_SEEDS.lighting.includes("xyz"), false);
  const decision = discoverConnectorPath("xyz", "XYZ", "sensor.motion.changed", [], registry);
  assert.equal(decision.step, "OFFICIAL_LOCAL_API");
  assert.equal(registry.get("xyz")?.lifecycle, "CANDIDATE_LEGAL_REVIEW_REQUIRED");
  assert.equal(registry.executable("xyz", "sensor.motion.changed"), false);
});
