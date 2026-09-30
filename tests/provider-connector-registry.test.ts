import test from "node:test";
import assert from "node:assert/strict";
import { ProviderConnectorRegistry, deviceSupportsOperation, type ProviderConnectorManifest } from "../src/automation/providerConnectorRegistry";
import { ConnectorRuntime } from "../src/automation/connectorRuntime";
import { resolveDeviceCapability } from "../src/automation/capabilityResolver";
import { acceptDiscoveryResult, discoverConnectorPath, DISCOVERY_SEEDS, validateDiscoveryResult, type ConnectorDiscoveryResult } from "../src/automation/connectorDiscovery";
import { createConnectorDiscoveryServerClient } from "../src/automation/connectorDiscoveryServerClient";

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


function researchedCandidate(providerId = "switchbot"): ConnectorDiscoveryResult {
  return {
    providerIdentity: { providerId, displayName: "SwitchBot" },
    officialDocumentationSources: [{
      url: "https://github.com/OpenWonderLabs/SwitchBotAPI",
      kind: "OFFICIAL_GITHUB",
      providerOwned: false,
      retrievedAt: "2026-09-30T10:00:00Z"
    }],
    candidateManifest: {
      providerId,
      displayName: "SwitchBot",
      kind: "DYNAMIC",
      category: "home",
      aliases: ["switchbot"],
      deviceTypes: ["switch"],
      transport: "CLOUD_REST",
      authentication: "oauth-or-token",
      discovery: "official-documentation-research",
      triggers: [],
      conditions: [],
      actions: [{
        capabilityId: "switch.power.set",
        inputSchema: {
          provider: { type: "string", required: false },
          brand: { type: "string", required: false },
          device: { type: "string", required: false },
          room: { type: "string", required: false },
          vehicle: { type: "string", required: false },
          on: { type: "boolean", required: true }
        },
        resultSchema: { success: { type: "boolean", required: true } },
        risk: "LOW",
        confirmationRequired: false,
        sourceUrls: ["https://github.com/OpenWonderLabs/SwitchBotAPI"]
      }],
      eventSchemas: {},
      capabilitySources: {},
      allowedDomains: [],
      localNetworkRequired: false,
      backgroundCapability: "NONE",
      eventInstallationSupported: false,
      regionAvailability: [],
      commercialUseStatus: "UNKNOWN",
      apiVersion: "unknown",
      documentationSources: [{
        url: "https://github.com/OpenWonderLabs/SwitchBotAPI",
        kind: "OFFICIAL_GITHUB",
        providerOwned: false,
        retrievedAt: "2026-09-30T10:00:00Z"
      }],
      connectorVersion: 1,
      lifecycle: "CANDIDATE_LEGAL_REVIEW_REQUIRED",
      verification: {
        documentation: false,
        authentication: false,
        endpointAllowlist: false,
        inputSchema: false,
        outputSchema: false,
        riskClassification: false,
        terms: false,
        connectorTests: false
      },
      confidence: 0.8
    },
    authenticationType: "oauth-or-token",
    transport: "CLOUD_REST",
    capabilities: ["switch.power.set"],
    eventSupport: false,
    commercialStatus: "UNKNOWN",
    verificationState: "CANDIDATE_LEGAL_REVIEW_REQUIRED",
    blockingReasons: ["Independent review required."]
  };
}

test("server discovery candidates stay non-executable until independently verified", () => {
  const registry = new ProviderConnectorRegistry();
  const result = researchedCandidate();
  assert.equal(validateDiscoveryResult(result), true);
  acceptDiscoveryResult(result, registry);
  assert.equal(registry.getProvider("switchbot")?.lifecycle, "CANDIDATE_LEGAL_REVIEW_REQUIRED");
  assert.equal(registry.executable("switchbot", "switch.power.set"), false);

  const forgedReady = {
    ...result,
    verificationState: "READY",
    candidateManifest: {
      ...result.candidateManifest,
      lifecycle: "READY",
      commercialUseStatus: "ALLOWED",
      verification: Object.fromEntries(Object.keys(result.candidateManifest.verification).map(key => [key, true]))
    }
  };
  assert.equal(validateDiscoveryResult(forgedReady), false);

  const forgedVerifiedSource = {
    ...result,
    candidateManifest: {
      ...result.candidateManifest,
      documentationSources: result.candidateManifest.documentationSources.map(source => ({
        ...source,
        providerOwned: true,
        verifiedAt: "2026-09-30T10:05:00Z"
      }))
    }
  };
  assert.equal(validateDiscoveryResult(forgedVerifiedSource), false);

  assert.equal(validateDiscoveryResult({ ...result, transport: "LOCAL_REST" }), false);
  assert.equal(validateDiscoveryResult({ ...result, commercialStatus: "BLOCKED" }), false);
  assert.equal(validateDiscoveryResult({ ...result, capabilities: ["light.power.set"] }), false);
});

test("discovery cannot replace a shipped READY connector", () => {
  const candidate = researchedCandidate("xyz").candidateManifest;
  const ready: ProviderConnectorManifest = {
    ...candidate,
    displayName: "XYZ",
    commercialUseStatus: "ALLOWED",
    lifecycle: "READY"
  };
  const registry = new ProviderConnectorRegistry([ready], new Set(["xyz"]), [ready]);
  assert.throws(() => acceptDiscoveryResult({
    ...researchedCandidate("xyz"),
    providerIdentity: { providerId: "xyz", displayName: "XYZ candidate" },
    candidateManifest: { ...researchedCandidate("xyz").candidateManifest, displayName: "XYZ candidate" }
  }, registry), /DISCOVERY_CANNOT_REPLACE_READY/);
  assert.equal(registry.getProvider("xyz")?.lifecycle, "READY");
});


test("connector discovery client excludes household details from cloud research", async () => {
  let body: Record<string, unknown> | null = null;
  const candidate = researchedCandidate();
  const client = createConnectorDiscoveryServerClient({
    supabaseUrl: "https://example.supabase.co",
    publishableKey: "publishable",
    getAccessToken: async () => "session-token",
    fetcher: async (_input, init) => {
      body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(JSON.stringify({ ok: true, ...candidate }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
  });

  const result = await client.discover({
    providerName: "SwitchBot",
    providerHints: ["SwitchBot"],
    requestedCapabilities: ["switch.power.set"],
    deviceHints: ["Gas Wohnzimmer Schalter"],
    locale: "de",
    region: "DE",
    room: "Privates Wohnzimmer"
  });

  assert.ok(result);
  assert.equal(body?.providerName, "SwitchBot");
  assert.deepEqual(body?.requestedCapabilities, ["switch.power.set"]);
  assert.equal("deviceHints" in (body ?? {}), false);
  assert.equal("room" in (body ?? {}), false);
});
