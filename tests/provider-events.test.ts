import assert from "node:assert/strict";
import test from "node:test";
import {
  ingestProviderEvent,
  MemoryProviderEventReceiptStore,
  type NormalizedProviderEvent,
  type ProviderEventVerifier
} from "../src/automation/providerEventDispatch";
import { ProviderConnectorRegistry, type ProviderConnectorManifest } from "../src/automation/providerConnectorRegistry";
import { BUILTIN_CONNECTOR_MANIFESTS } from "../src/automation/builtinConnectorManifests";
import { acceptSemanticAutomationOutput } from "../src/automation/semanticInterpreter";
import { materializeShortcutDefinition } from "../src/automation/materialization";

function eventRegistry(): ProviderConnectorRegistry {
  const base = BUILTIN_CONNECTOR_MANIFESTS.find(item => item.providerId === "home-assistant");
  assert.ok(base);
  const manifest: ProviderConnectorManifest = {
    ...JSON.parse(JSON.stringify(base)),
    lifecycle: "READY",
    commercialUseStatus: "ALLOWED",
    backgroundCapability: "SERVER",
    eventInstallationSupported: true,
    triggers: ["sensor.motion.changed"],
    eventSchemas: { "sensor.motion.changed": { value: "boolean" } }
  };
  return new ProviderConnectorRegistry([manifest], new Set(["home-assistant"]), [manifest]);
}

function providerAutomation() {
  const parsed = acceptSemanticAutomationOutput("HA Bewegung", JSON.stringify({
    kind: "automation",
    confidence: 0.99,
    trigger: { capabilityId: "trigger.provider-event", parameters: { provider: "home-assistant", event: "motion-detected" } },
    actions: [{ capabilityId: "system.brightness.set", parameters: { percent: 25 } }],
    clarificationQuestion: null,
    suggestion: null
  }));
  assert.equal(parsed.kind, "understood");
  if (parsed.kind !== "understood") throw new Error("semantic setup failed");
  return { ...materializeShortcutDefinition(parsed.definition), enabled: true };
}

const fixedNow = new Date("2026-09-30T00:00:00Z");

function normalized(overrides: Partial<NormalizedProviderEvent> = {}): NormalizedProviderEvent {
  return {
    eventId: "evt-1",
    providerId: "home-assistant",
    installationId: "install-1",
    deviceId: "binary_sensor.hall_motion",
    capabilityId: "sensor.motion.changed",
    eventType: "motion-detected",
    normalizedPayload: { value: true },
    occurredAt: "2026-09-29T23:59:50Z",
    receivedAt: "2026-09-29T23:59:51Z",
    verification: { verified: true, method: "WEBSOCKET_SESSION", verifiedAt: "2026-09-29T23:59:51Z" },
    ...overrides
  };
}

function verifierFor(event: NormalizedProviderEvent): ProviderEventVerifier {
  return async () => event;
}

test("provider ingress validates and dispatches an authenticated normalized event", async () => {
  const automation = providerAutomation();
  let runs = 0;
  const result = await ingestProviderEvent(
    { providerId: "home-assistant", installationId: "install-1", headers: {}, body: { untrusted: "ignored" }, receivedAt: "2026-09-29T23:59:51Z" },
    [automation],
    async item => {
      runs += 1;
      assert.equal(item.definition.actions[0]?.parameters.percent, 25);
      return { automationId: item.id, status: "SUCCESS", executedSteps: ["system.brightness.set"], humanMessage: "ok", timestamp: fixedNow.toISOString() };
    },
    { verifier: verifierFor(normalized()), receipts: new MemoryProviderEventReceiptStore(), registry: eventRegistry(), now: fixedNow }
  );
  assert.equal(result.accepted, true);
  assert.equal(runs, 1);
  if (result.accepted) assert.deepEqual(result.dispatch.matchedAutomationIds, [automation.id]);
});

test("provider ingress is idempotent for duplicate provider events", async () => {
  const automation = providerAutomation();
  const receipts = new MemoryProviderEventReceiptStore();
  const options = { verifier: verifierFor(normalized()), receipts, registry: eventRegistry(), now: fixedNow };
  let runs = 0;
  const raw = { providerId: "home-assistant", installationId: "install-1", headers: {}, body: {}, receivedAt: "2026-09-29T23:59:51Z" };
  const execute = async (item: typeof automation) => {
    runs += 1;
    return { automationId: item.id, status: "SUCCESS" as const, executedSteps: [], humanMessage: "ok", timestamp: fixedNow.toISOString() };
  };
  const first = await ingestProviderEvent(raw, [automation], execute, options);
  const second = await ingestProviderEvent(raw, [automation], execute, options);
  assert.equal(first.accepted, true);
  assert.equal(second.accepted, false);
  assert.equal(second.duplicate, true);
  assert.equal(runs, 1);
});

test("provider ingress rejects stale, malformed and unready events before execution", async () => {
  const automation = providerAutomation();
  let runs = 0;
  const execute = async () => {
    runs += 1;
    return { automationId: automation.id, status: "SUCCESS" as const, executedSteps: [], humanMessage: "ok", timestamp: fixedNow.toISOString() };
  };
  const raw = { providerId: "home-assistant", installationId: "install-1", headers: {}, body: {}, receivedAt: "2026-09-29T23:59:51Z" };

  const stale = await ingestProviderEvent(raw, [automation], execute, {
    verifier: verifierFor(normalized({ occurredAt: "2026-09-29T22:00:00Z" })),
    receipts: new MemoryProviderEventReceiptStore(),
    registry: eventRegistry(),
    now: fixedNow
  });
  assert.equal(stale.accepted, false);

  const malformed = await ingestProviderEvent(raw, [automation], execute, {
    verifier: verifierFor(normalized({ normalizedPayload: { active: "yes" } })),
    receipts: new MemoryProviderEventReceiptStore(),
    registry: eventRegistry(),
    now: fixedNow
  });
  assert.equal(malformed.accepted, false);

  const candidateBase = BUILTIN_CONNECTOR_MANIFESTS.find(item => item.providerId === "home-assistant");
  assert.ok(candidateBase);
  const candidateManifest: ProviderConnectorManifest = {
    ...JSON.parse(JSON.stringify(candidateBase)),
    lifecycle: "CANDIDATE",
    commercialUseStatus: "UNKNOWN"
  };
  const candidate = new ProviderConnectorRegistry([candidateManifest]);
  const unready = await ingestProviderEvent(raw, [automation], execute, {
    verifier: verifierFor(normalized()),
    receipts: new MemoryProviderEventReceiptStore(),
    registry: candidate,
    now: fixedNow
  });
  assert.equal(unready.accepted, false);
  assert.equal(runs, 0);
});

test("provider ingress rejects verifier identity substitution", async () => {
  const automation = providerAutomation();
  const result = await ingestProviderEvent(
    { providerId: "home-assistant", installationId: "install-1", headers: {}, body: {}, receivedAt: "2026-09-29T23:59:51Z" },
    [automation],
    async item => ({ automationId: item.id, status: "SUCCESS", executedSteps: [], humanMessage: "ok", timestamp: fixedNow.toISOString() }),
    {
      verifier: verifierFor(normalized({ providerId: "evil-provider" })),
      receipts: new MemoryProviderEventReceiptStore(),
      registry: eventRegistry(),
      now: fixedNow
    }
  );
  assert.equal(result.accepted, false);
  assert.equal(result.duplicate, false);
});


test("universal provider event matches universal sensor trigger without legacy event wrapper", async () => {
  const parsed = acceptSemanticAutomationOutput("Bewegung Flur", JSON.stringify({
    kind: "automation",
    confidence: 0.99,
    trigger: { capabilityId: "sensor.motion.changed", parameters: { provider: "home-assistant", room: "Flur", value: true } },
    actions: [{ capabilityId: "system.brightness.set", parameters: { percent: 20 } }],
    clarificationQuestion: null,
    suggestion: null
  }));
  assert.equal(parsed.kind, "understood");
  if (parsed.kind !== "understood") throw new Error("semantic setup failed");
  const automation = { ...materializeShortcutDefinition(parsed.definition), enabled: true };
  let runs = 0;
  const result = await ingestProviderEvent(
    { providerId: "home-assistant", installationId: "install-1", headers: {}, body: {}, receivedAt: "2026-09-29T23:59:51Z" },
    [automation],
    async item => {
      runs += 1;
      return { automationId: item.id, status: "SUCCESS", executedSteps: ["system.brightness.set"], humanMessage: "ok", timestamp: fixedNow.toISOString() };
    },
    {
      verifier: verifierFor(normalized({
        eventType: "sensor.motion.changed",
        capabilityId: "sensor.motion.changed",
        room: "Flur",
        normalizedPayload: { value: true }
      })),
      receipts: new MemoryProviderEventReceiptStore(),
      registry: eventRegistry(),
      now: fixedNow
    }
  );
  assert.equal(result.accepted, true);
  assert.equal(runs, 1);
  if (result.accepted) assert.deepEqual(result.dispatch.matchedAutomationIds,[automation.id]);
});
