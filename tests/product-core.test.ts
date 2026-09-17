import test from "node:test";
import assert from "node:assert/strict";
import { solutions } from "../src/data/solutions";
import { resolveConversation } from "../src/lib/conversation";
import { rankSolutions } from "../src/lib/search";
import { shortcutAssistantPlan } from "../src/lib/shortcutAssistant";
import type { DeviceContext } from "../src/types";

const iosContext: DeviceContext = {
  platform: "ios",
  region: "eu",
  osMajor: 27,
  language: "de"
};

test("irrelevant questions do not get a native false-positive", () => {
  const ranked = rankSolutions("züchte tomaten auf dem balkon", solutions, "ios");
  assert.equal(ranked.length, 0);
});

test("precise Siri request returns a relevant Siri solution", () => {
  const result = resolveConversation("Wie aktiviere ich Siri?", solutions, iosContext);
  assert.ok(result.solutions.length > 0);
  assert.match(result.solutions[0].title.toLowerCase(), /siri/);
});

test("generic enable request asks one useful clarification", () => {
  const result = resolveConversation("Wie mache ich das an?", solutions, iosContext);
  assert.equal(typeof result.followUp, "string");
  assert.ok((result.followUp ?? "").length > 8);
});

test("car automation creates a human-readable shortcut clarification", () => {
  const plan = shortcutAssistantPlan("Beim Losfahren automatisch Navigation starten", null);
  assert.equal(plan.applicable, true);
  assert.equal(typeof plan.clarification, "string");
  assert.ok((plan.choices ?? []).length >= 2);
  assert.ok(plan.steps.length >= 3);
});

test("Tesla shortcut assistant never assumes unsupported actions", () => {
  const tesla = solutions.find((item) => item.id === "ios-tesla-siri-unlock") ?? null;
  const plan = shortcutAssistantPlan("Tesla mit Siri öffnen", tesla);
  assert.equal(plan.applicable, true);
  assert.match(plan.explanation, /Tesla-App/);
  assert.ok(plan.steps.some((step) => /tatsächlich anbietet/i.test(step)));
});
