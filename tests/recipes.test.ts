import test from "node:test";
import assert from "node:assert/strict";
import { recipeSolutions, tipSolutions } from "../src/data/solutions";
import { categoriesWithSolutions } from "../src/data/categories";
import { automationSteps, TRIGGERS } from "../src/lib/automationSteps";

test("there are enough recipes, and enough of them are free to try", () => {
  assert.ok(recipeSolutions.length >= 20, `only ${recipeSolutions.length} recipes`);
  const free = recipeSolutions.filter((item) => item.automation?.tier === "free");
  assert.ok(free.length >= 5, `only ${free.length} free recipes`);
  assert.ok(free.length < recipeSolutions.length / 2, "Pro must still be worth buying");
});

test("every recipe is a complete, guided Kurzbefehle automation", () => {
  for (const item of recipeSolutions) {
    const spec = item.automation!;
    assert.ok(TRIGGERS[spec.trigger.kind], `${item.id}: unknown trigger`);
    assert.ok(spec.trigger.when.length > 5 && spec.then.length > 3, `${item.id}: card text`);
    assert.ok(spec.actions.length >= 1, `${item.id}: needs an action`);
    assert.ok(spec.prompt.length > 20, `${item.id}: Apple Intelligence sentence`);
    assert.deepEqual(item.steps, automationSteps(spec), `${item.id}: steps must come from the blueprint`);
    assert.match(item.steps[0], /Kurzbefehle/, `${item.id}: starts in Kurzbefehle`);
    assert.match(item.steps[2], new RegExp(TRIGGERS[spec.trigger.kind].label), `${item.id}: names the trigger`);
    assert.ok(item.steps.length <= 12, `${item.id}: too many steps for a beginner`);
    assert.ok(item.category.startsWith("auto-"), `${item.id}: automation category`);
  }
});

test("automations that move things in the real world carry a safety note", () => {
  const tesla = recipeSolutions.find((item) => item.id === "auto-tesla-leave-trunk");
  assert.ok(tesla?.automation?.safety && tesla.automation.safety.length > 40);
});

test("recipes and tips are shown in separate areas", () => {
  assert.ok(tipSolutions.every((item) => !item.automation));
  const automationTopics = categoriesWithSolutions(recipeSolutions, "ios", "automation");
  const tipTopics = categoriesWithSolutions(tipSolutions, "ios", "tip");
  assert.ok(automationTopics.length >= 5);
  assert.ok(tipTopics.every((topic) => !topic.id.startsWith("auto-")));
  assert.equal(automationTopics.reduce((sum, topic) => sum + topic.count, 0), recipeSolutions.length);
});
