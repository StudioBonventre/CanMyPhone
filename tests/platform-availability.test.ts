import test from "node:test";
import assert from "node:assert/strict";
import { solutions } from "../src/data/solutions";
import { resolveConversation } from "../src/lib/conversation";
import type { DeviceContext } from "../src/types";

const euIPhone: DeviceContext = {
  platform: "ios",
  region: "eu",
  osMajor: 27,
  language: "de"
};

test("Apple Intelligence setup remains discoverable in the EU catalogue", () => {
  const result = resolveConversation("Apple Intelligence aktivieren", solutions, euIPhone);
  assert.equal(result.solutions[0]?.id, "ios-enable-apple-intelligence");
});

test("new Siri AI request uses the EU-specific status path", () => {
  const result = resolveConversation("Siri AI aktivieren", solutions, euIPhone);
  assert.equal(result.solutions[0]?.id, "ios-siri-ai-eu-status");
  assert.match(result.notice ?? "", /Siri AI/i);
});
