import test from "node:test";
import assert from "node:assert/strict";
import { solutions } from "../src/data/solutions";
import { top100Settings } from "../src/data/top100Settings";

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
