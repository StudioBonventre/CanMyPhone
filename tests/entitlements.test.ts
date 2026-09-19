import test from "node:test";
import assert from "node:assert/strict";
import {
  addCredits,
  automaticActionAccess,
  consumeAutomaticAction,
  DEFAULT_ENTITLEMENTS,
  proFeatureAccess,
  setPro
} from "../src/lib/entitlements";

test("first automatic action is free and is consumed only after success", () => {
  const access = automaticActionAccess(DEFAULT_ENTITLEMENTS);
  assert.equal(access.allowed, true);
  assert.equal(access.reason, "first-free");
  const after = consumeAutomaticAction(DEFAULT_ENTITLEMENTS);
  assert.equal(after.freeAutomaticActionUsed, true);
  assert.equal(after.credits, 0);
});

test("credits are consumed after the free action", () => {
  const state = { ...DEFAULT_ENTITLEMENTS, freeAutomaticActionUsed: true, credits: 2 };
  assert.equal(automaticActionAccess(state).reason, "credit");
  assert.equal(consumeAutomaticAction(state).credits, 1);
});

test("pro never consumes credits and locked users stay unchanged", () => {
  const pro = setPro({ ...DEFAULT_ENTITLEMENTS, freeAutomaticActionUsed: true, credits: 3 }, true);
  assert.equal(consumeAutomaticAction(pro).credits, 3);
  const locked = { ...DEFAULT_ENTITLEMENTS, freeAutomaticActionUsed: true };
  assert.equal(automaticActionAccess(locked).allowed, false);
  assert.deepEqual(consumeAutomaticAction(locked), locked);
});

test("premium-only features require a real pro entitlement", () => {
  assert.equal(proFeatureAccess(DEFAULT_ENTITLEMENTS), false);
  assert.equal(proFeatureAccess(setPro(DEFAULT_ENTITLEMENTS, true)), true);
});

test("adding credits rejects invalid values", () => {
  assert.equal(addCredits(DEFAULT_ENTITLEMENTS, 2.8).credits, 2);
  assert.equal(addCredits(DEFAULT_ENTITLEMENTS, -1).credits, 0);
});
