import test from "node:test";
import assert from "node:assert/strict";
import { solutions } from "../src/data/solutions";
import {
  DEFAULT_ENTITLEMENTS,
  entitlementsFromActiveProducts,
  isLocked,
  normalizeEntitlements,
  PRO_PRODUCT_IDS
} from "../src/lib/entitlements";

function must<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`missing ${label}`);
  return value;
}

const proRecipe = must(solutions.find((item) => item.automation?.tier === "pro"), "pro recipe");
const freeRecipe = must(solutions.find((item) => item.automation?.tier === "free"), "free recipe");
const tip = must(solutions.find((item) => !item.automation), "tip");

test("tips and free recipes are never locked", () => {
  assert.equal(isLocked(tip, DEFAULT_ENTITLEMENTS), false);
  assert.equal(isLocked(freeRecipe, DEFAULT_ENTITLEMENTS), false);
});

test("pro recipes are locked without and unlocked with Pro", () => {
  assert.equal(isLocked(proRecipe, DEFAULT_ENTITLEMENTS), true);
  assert.equal(isLocked(proRecipe, { pro: true }), false);
});

test("only known product ids unlock Pro", () => {
  assert.equal(entitlementsFromActiveProducts([PRO_PRODUCT_IDS.yearly], 1).pro, true);
  assert.equal(entitlementsFromActiveProducts([PRO_PRODUCT_IDS.monthly], 1).productId, PRO_PRODUCT_IDS.monthly);
  assert.equal(entitlementsFromActiveProducts(["com.example.other"], 1).pro, false);
  assert.equal(entitlementsFromActiveProducts([], 1).pro, false);
});

test("old persisted credit state is read safely", () => {
  assert.deepEqual(normalizeEntitlements({ pro: false, credits: 3, freeAutomaticActionUsed: true }), {
    pro: false,
    productId: undefined,
    checkedAt: undefined
  });
  assert.equal(normalizeEntitlements(null).pro, false);
  assert.equal(normalizeEntitlements("garbage").pro, false);
});
