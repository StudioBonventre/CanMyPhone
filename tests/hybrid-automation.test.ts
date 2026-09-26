import assert from "node:assert/strict";
import test from "node:test";
import { compileShortcutGoal } from "../src/automation/shortcutCompiler";
import { installationPlanForDefinition } from "../src/automation/installationPlan";
import { materializeShortcutDefinition, approveSensitiveAutomation, homekitInstallationFingerprint } from "../src/automation/materialization";
import { runStoredAutomation } from "../src/automation/runner";
import { acceptSemanticAutomationOutput } from "../src/automation/semanticInterpreter";

test("Instagram opening invokes one CanMyPhone runner intent and no Shortcut brightness action", () => {
  const definition = compileShortcutGoal("Wenn ich Instagram öffne, stelle die Helligkeit auf 35 %.");
  const plan = installationPlanForDefinition(definition);
  const stored = materializeShortcutDefinition(definition);
  assert.deepEqual(stored.installationPlan,plan);
  assert.equal(plan.triggerHost, "APPLE_PERSONAL_AUTOMATION");
  assert.deepEqual(plan.actionHosts, ["CANMYPHONE_NATIVE"]);
  assert.equal(plan.runnerIntentRequired, true);
  assert.equal(plan.shortcutActionCount, 0);
  assert.deepEqual(plan.runtimePath, ["iOS-Systemauslöser", "CanMyPhone App Intent", "CanMyPhone Runner"]);
  assert.equal(stored.personalSetup?.setupSteps.filter(step => step.includes("CanMyPhone Automation ausführen")).length, 1);
  assert.equal(stored.personalSetup?.setupSteps.some(step => step.includes("Apples Aktion")), false);
  assert.equal(stored.definition.actions[0]?.parameters.percent, 35);
});

test("location plus Tesla or Homematic stays within native trigger and provider action hosts", () => {
  for (const [trigger, action] of [
    [{capabilityId:"trigger.location-exit",parameters:{value:"home"}}, {capabilityId:"vehicle.lock",parameters:{brand:"Tesla"}}],
    [{capabilityId:"trigger.location-enter",parameters:{value:"home"}}, {capabilityId:"smart-home.cover.open",parameters:{provider:"Homematic IP",room:"Wohnzimmer"}}]
  ] as const) {
    const parsed=acceptSemanticAutomationOutput("Ortsautomation",JSON.stringify({kind:"automation",confidence:0.99,trigger,actions:[action],clarificationQuestion:null,suggestion:null}));
    assert.equal(parsed.kind,"understood");
    if(parsed.kind!=="understood")continue;
    const plan=installationPlanForDefinition(parsed.definition);
    assert.equal(plan.triggerHost,"CANMYPHONE_NATIVE");
    assert.deepEqual(plan.actionHosts,["PROVIDER"]);
    assert.equal(plan.runnerIntentRequired,false);
    assert.equal(materializeShortcutDefinition(parsed.definition).personalSetup,undefined);
  }
});

test("HomeKit sensor and light use one HomeKit installation without Personal Automation", async () => {
  const natural=compileShortcutGoal("Wenn die Haustür geöffnet wird, schalte das Licht im Flur an.");
  assert.equal(natural.trigger.capabilityId,"trigger.homekit-characteristic");
  assert.equal(natural.actions[0]?.capabilityId,"smart-home.light.set");
  assert.equal(installationPlanForDefinition(natural).installationHost,"HOMEKIT");
  const base=compileShortcutGoal("Setze Helligkeit auf 35 %.");
  const definition={...base,trigger:{capabilityId:"trigger.homekit-characteristic",parameters:{home:"Zuhause",sensor:"Haustür",sensorType:"contact",value:true}},actions:[{capabilityId:"smart-home.light.set",parameters:{provider:"apple-home",room:"Flur",value:"on"}}],integrations:[],requiredSetup:["home"],risk:"low" as const,confirmationRequired:false,background:true};
  const plan=installationPlanForDefinition(definition);
  assert.equal(plan.triggerHost,"HOMEKIT");
  assert.deepEqual(plan.actionHosts,["HOMEKIT"]);
  assert.equal(plan.installationHost,"HOMEKIT");
  assert.equal(plan.runnerIntentRequired,false);
  const stored=materializeShortcutDefinition(definition);
  assert.equal(stored.personalSetup,undefined);
  const altered={...stored,definition:{...stored.definition,trigger:{...stored.definition.trigger,parameters:{...stored.definition.trigger.parameters,sensor:"Hintertür"}}}};
  assert.notEqual(homekitInstallationFingerprint(stored),homekitInstallationFingerprint(altered));
  const run=await runStoredAutomation({...stored,enabled:true},{pro:true,grantedPermissions:new Set(["home"]),connectedIntegrations:new Set()},async()=>true);
  assert.equal(run.errorCode,"HOMEKIT_OWNS_EXECUTION");
});

test("HomeKit sensor with external provider fails closed as an unsupported installation", () => {
  const base=compileShortcutGoal("Setze Helligkeit auf 35 %.");
  const definition={...base,trigger:{capabilityId:"trigger.homekit-characteristic",parameters:{home:"Zuhause",sensor:"Haustür",sensorType:"contact",value:true}},actions:[{capabilityId:"vehicle.lock",parameters:{brand:"Tesla"}}],integrations:[],requiredSetup:["home"],risk:"high" as const,confirmationRequired:true,background:true};
  assert.equal(installationPlanForDefinition(definition).installationHost,"UNSUPPORTED");
  assert.equal(materializeShortcutDefinition(definition).materializationState,"BROKEN");
});

test("explicit Apple Home daily light schedule installs in HomeKit",()=>{
  const definition=compileShortcutGoal("In Apple Home um 18 Uhr Licht im Flur an.");
  assert.equal(definition.trigger.capabilityId,"trigger.homekit-time");
  assert.equal(definition.actions[0]?.capabilityId,"smart-home.light.set");
  assert.equal(installationPlanForDefinition(definition).installationHost,"HOMEKIT");
  assert.equal(materializeShortcutDefinition(definition).personalSetup,undefined);
});

test("time trigger keeps Apple setup; Shortcut-only action remains an Apple action", () => {
  const timed=installationPlanForDefinition(compileShortcutGoal("Jeden Werktag um 7 Uhr Navigation zur Arbeit."));
  assert.equal(timed.triggerHost,"APPLE_PERSONAL_AUTOMATION");
  const battery=installationPlanForDefinition(compileShortcutGoal("Wenn Akku unter 20 %, Stromsparmodus an."));
  assert.deepEqual(battery.actionHosts,["APPLE_SHORTCUTS"]);
  assert.equal(battery.shortcutActionCount,1);
  assert.equal(battery.runnerIntentRequired,false);
});

test("unknown triggers cannot be materialized and sensitive actions still need approval", async () => {
  const definition=compileShortcutGoal("Setze Helligkeit auf 35 %.");
  assert.throws(()=>materializeShortcutDefinition({...definition,trigger:{capabilityId:"trigger.private-api",parameters:{}}}),/INVALID_DEFINITION/);
  const parsed=acceptSemanticAutomationOutput("Tesla verriegeln",JSON.stringify({kind:"automation",confidence:0.99,trigger:{capabilityId:"trigger.manual",parameters:{}},actions:[{capabilityId:"vehicle.lock",parameters:{brand:"Tesla"}}],clarificationQuestion:null,suggestion:null}));
  assert.equal(parsed.kind,"understood");
  if(parsed.kind!=="understood")return;
  const item={...materializeShortcutDefinition(parsed.definition),enabled:true};
  const context={pro:true,grantedPermissions:new Set<string>(),connectedIntegrations:new Set(["tesla"])};
  assert.equal((await runStoredAutomation(item,context,async()=>true)).errorCode,"CONFIRMATION_REQUIRED");
  assert.equal(approveSensitiveAutomation(item).safetyApproval.confirmed,true);
});
