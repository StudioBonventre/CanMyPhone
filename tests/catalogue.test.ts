import test from "node:test";
import assert from "node:assert/strict";
import { categories } from "../src/data/categories";
import { solutions } from "../src/data/solutions";
import { resolveConversation } from "../src/lib/conversation";
import type { DeviceContext } from "../src/types";
import { realQueries } from "./realQueries";

const iosContext: DeviceContext = { platform: "ios", region: "eu", osMajor: 27, language: "de" };
const knownCategories = new Set(categories.map((category) => category.id));
const trustedSourceHosts = ["support.apple.com", "developer.apple.com", "apps.apple.com", "www.apple.com", "www.tesla.com", "docs.expo.dev"];

test("catalogue ids are unique", () => {
  const ids = solutions.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every solution is complete and source-backed", () => {
  for (const item of solutions) {
    assert.ok(item.title.trim().length > 3, `${item.id}: title`);
    assert.ok(item.summary.trim().length > 20, `${item.id}: summary`);
    assert.ok(item.steps.length >= 1, `${item.id}: steps`);
    assert.ok(item.aliases.length >= 3, `${item.id}: needs at least three aliases`);
    assert.ok(item.sources.length >= 1, `${item.id}: needs a source`);
    assert.ok(item.setupMinutes >= 0, `${item.id}: setupMinutes`);
    assert.ok(knownCategories.has(item.category), `${item.id}: unknown category ${item.category}`);
    for (const source of item.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:", `${item.id}: https only`);
      assert.ok(trustedSourceHosts.includes(url.hostname), `${item.id}: untrusted source host ${url.hostname}`);
    }
    if (item.settings?.path) {
      assert.ok(["Einstellungen", "Kontrollzentrum"].includes(item.settings.path[0]), `${item.id}: settings path must start at a real entry point`);
    }
  }
});

test("catalogue covers at least 90 verified capabilities", () => {
  assert.ok(solutions.length >= 90, `only ${solutions.length}`);
});

test("everyday problem phrasings find the right capability first", () => {
  const misses: string[] = [];
  for (const { query, expected } of realQueries) {
    const result = resolveConversation(query, solutions, iosContext);
    if (result.solutions[0]?.id !== expected) misses.push(`${query} → ${result.solutions[0]?.id ?? "nothing"}`);
  }
  const hitRate = 1 - misses.length / realQueries.length;
  assert.ok(hitRate >= 0.95, `top-1 hit rate ${(hitRate * 100).toFixed(0)} %\n${misses.join("\n")}`);
});

test("off-topic questions never get a confident answer", () => {
  for (const query of ["Wie backe ich Brot?", "Rezept für Lasagne", "Wer hat die WM gewonnen?", "Steuererklärung machen", "züchte tomaten auf dem balkon"]) {
    const result = resolveConversation(query, solutions, iosContext);
    assert.ok(result.solutions.length === 0 || result.uncertain, `${query} → ${result.solutions[0]?.id}`);
  }
});

test("a single matching word among several asks instead of asserting", () => {
  const result = resolveConversation("Batterie stirbt mittags", solutions, iosContext);
  assert.ok(result.solutions.length > 0);
  assert.equal(result.uncertain, true);
});

test("Apple Intelligence-only features are hidden on devices that cannot run them", () => {
  const capable = resolveConversation("Telefonat übersetzen", solutions, { ...iosContext, appleIntelligenceCapable: true });
  const notCapable = resolveConversation("Telefonat übersetzen", solutions, { ...iosContext, appleIntelligenceCapable: false });
  assert.ok(capable.solutions.some((item) => item.id === "ios-live-translation-calls"));
  assert.ok(!notCapable.solutions.some((item) => item.id === "ios-live-translation-calls"));
});
