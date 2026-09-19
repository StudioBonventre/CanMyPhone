import test from "node:test";
import assert from "node:assert/strict";
import { matchCapabilities } from "../src/automation/capabilities";
import { executeValidatedPlan } from "../src/automation/execution";
import { clearPersonalization, EMPTY_PERSONALIZATION_PROFILE, recordSignal, suggestionsAllowed } from "../src/automation/personalization";
import { acceptServerPlannerOutput, compileVerifiedGoal } from "../src/automation/planner";
import { createTeslaRearTrunkPlan } from "../src/automation/teslaPlan";
import { validateAutomationPlan } from "../src/automation/validation";
import { sanitizeEventProperties } from "../src/lib/analytics";

test("Tesla plan is schema-valid and capability allow-listed", () => {
  const plan = createTeslaRearTrunkPlan();
  assert.equal(validateAutomationPlan(plan).ok, true);
  assert.deepEqual(matchCapabilities(plan.capabilityIds).missing, []);
  assert.equal(plan.confirmationRequired, true);
  assert.equal(plan.riskLevel, "high");
});

test("natural-language Tesla goal compiles to the verified plan", () => {
  const result = compileVerifiedGoal("Wenn ich mich von meinem Tesla entferne, schließe automatisch den Heckkofferraum");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.plan.id, "tesla-rear-trunk-geofence-v1");
});

test("server AI output remains untrusted until schema and capability validation pass", () => {
  const unsafe = { ...createTeslaRearTrunkPlan(), capabilityIds: ["private.ios.settings"] };
  assert.equal(acceptServerPlannerOutput(unsafe).ok, false);
  assert.equal(acceptServerPlannerOutput(createTeslaRearTrunkPlan()).ok, true);
});

test("Tesla plan never treats toggle as an unconditional close", () => {
  const plan = createTeslaRearTrunkPlan();
  assert.ok(plan.conditions.some((item) => item.id === "rear-trunk-open"));
  assert.equal(plan.actions[0]?.parameters.expectedPriorState, "open");
  assert.ok(plan.fallbacks.some((item) => item.id === "unknown-state" && item.mode === "abort"));
});

test("unknown capabilities and understated risks are rejected", () => {
  const plan = createTeslaRearTrunkPlan();
  assert.equal(validateAutomationPlan({ ...plan, capabilityIds: [...plan.capabilityIds, "private.ios.api"] }).ok, false);
  assert.equal(validateAutomationPlan({ ...plan, riskLevel: "low" }).ok, false);
});

test("sensitive execution requires confirmation and provider success", async () => {
  const plan = createTeslaRearTrunkPlan();
  let calls = 0;
  const provider = { execute: async () => { calls += 1; return { ok: true as const, confirmed: true as const }; } };
  assert.equal((await executeValidatedPlan(plan, provider, false)).ok, false);
  assert.equal(calls, 0);
  assert.equal((await executeValidatedPlan(plan, provider, true)).ok, true);
  assert.equal(calls, 1);
});

test("provider failure selects a truthful fallback", async () => {
  const plan = createTeslaRearTrunkPlan();
  const provider = { execute: async () => ({ ok: false as const, code: "vehicle_asleep" }) };
  const result = await executeValidatedPlan(plan, provider, true);
  assert.equal(result.ok, false);
  assert.match(result.message, /aufwecken/i);
});

test("personalization can be disabled and cleared", () => {
  const learned = recordSignal(EMPTY_PERSONALIZATION_PROFILE, { id: "1", kind: "accepted", capabilityId: "tesla", at: 1 });
  assert.equal(learned.signals.length, 1);
  assert.equal(suggestionsAllowed({ ...learned, proactiveSuggestions: false }), false);
  assert.equal(clearPersonalization(learned).signals.length, 0);
});

test("analytics strips raw sensitive properties", () => {
  assert.deepEqual(sanitizeEventProperties({ plan_id: "safe", raw_text: "secret", vin: "secret", pro: true }), { plan_id: "safe", pro: true });
});
