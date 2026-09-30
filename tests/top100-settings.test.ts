import test from "node:test";
import assert from "node:assert/strict";
import { solutions } from "../src/data/solutions";
import { top100Settings } from "../src/data/top100Settings";
import { top100CapabilityCounts, top100CapabilityFor } from "../src/lib/top100Capabilities";

test("Top 100 contains exactly 100 ranked unique settings", () => {
  assert.equal(top100Settings.length, 100);
  assert.deepEqual(top100Settings.map((item) => item.rank), Array.from({ length: 100 }, (_, index) => index + 1));
  assert.equal(new Set(top100Settings.map((item) => item.solutionId)).size, 100);
});

test("every Top 100 entry resolves to a real CanMyPhone solution", () => {
  const ids = new Set(solutions.map((item) => item.id));
  for (const item of top100Settings) {
    assert.ok(ids.has(item.solutionId), `missing solution for #${item.rank}: ${item.solutionId}`);
    assert.ok(item.title.trim().length > 0, `missing title for #${item.rank}`);
    assert.ok(item.query.trim().length > 0, `missing query for #${item.rank}`);
  }
});

test("every Top 100 entry has exactly one transparent capability level", () => {
  const allowed = new Set(["direct", "shortcut", "confirm"]);
  for (const item of top100Settings) {
    const capability = top100CapabilityFor(item);
    assert.ok(allowed.has(capability.level), `invalid capability for ${item.solutionId}`);
    assert.ok(capability.label.length > 4);
    assert.ok(capability.detail.length > 4);
  }
});

test("Top 100 exposes all three capability tiers and preserves all 100 entries", () => {
  const counts = top100CapabilityCounts(top100Settings);
  assert.ok(counts.direct > 0, "direct tier must not be empty");
  assert.ok(counts.shortcut > 0, "shortcut tier must not be empty");
  assert.ok(counts.confirm > 0, "confirmation tier must not be empty");
  assert.equal(counts.direct + counts.shortcut + counts.confirm, 100);
});

test("known premium examples are classified conservatively", () => {
  const brightness = top100Settings.find((item) => item.solutionId === "ios-set-brightness");
  const backTap = top100Settings.find((item) => item.solutionId === "ios-back-tap");
  const location = top100Settings.find((item) => item.solutionId === "top-setting-location-services");
  assert.ok(brightness && backTap && location);
  assert.equal(top100CapabilityFor(brightness).level, "direct");
  assert.equal(top100CapabilityFor(backTap).level, "shortcut");
  assert.equal(top100CapabilityFor(location).level, "confirm");
});
