import test from "node:test";
import assert from "node:assert/strict";
import { AutomationPersistence, type KeyValueStorage } from "../src/automation/automationPersistence";
import { actionExecutionMode, approveSensitiveAutomation, hasValidSafetyApproval, materializeShortcutDefinition, safetyDefinitionFingerprint, validateStoredAutomation } from "../src/automation/materialization";
import { runStoredAutomation } from "../src/automation/runner";
import { compileShortcutGoal } from "../src/automation/shortcutCompiler";
import { buildAppleIntelligenceAutomationDescription } from "../src/automation/appleShortcutsHandoff";
import { compileAutomationRuntime } from "../src/automation/engine";
import { ConnectorRuntime } from "../src/automation/connectorRuntime";
import { createTeslaConnectorAdapter, createHomematicIPConnectorAdapter } from "../src/automation/connectorAdapters";
import { acceptSemanticAutomationOutput } from "../src/automation/semanticInterpreter";
import { launcherPlanForDefinition } from "../src/automation/appLauncher";

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  async getItem(key:string){ return this.data.get(key) ?? null; }
  async setItem(key:string,value:string){ this.data.set(key,value); }
  async removeItem(key:string){ this.data.delete(key); }
}

const materialize = (goal:string) => materializeShortcutDefinition(compileShortcutGoal(goal), new Date("2026-09-19T10:00:00Z"));

test("persistence saves, loads, updates and deletes", async()=>{const storage=new MemoryStorage(),repo=new AutomationPersistence(storage);const item=materialize("Setze Helligkeit auf 35 %.");await repo.save(item);assert.equal((await repo.get(item.id))?.name,item.name);await repo.save({...item,enabled:true});assert.equal((await repo.get(item.id))?.enabled,true);await repo.remove(item.id);assert.equal(await repo.get(item.id),null);});
test("invalid stored schema versions are never loaded",async()=>{const storage=new MemoryStorage();await storage.setItem("canmyphone.automations.v1",JSON.stringify([{version:99,id:"cmp_auto_bad",enabled:true,definition:{}}]));assert.deepEqual(await new AutomationPersistence(storage).list(),[]);assert.equal(validateStoredAutomation({version:99}),false);});

const scenarios=[
 ["Wenn meine Bose Kopfhörer verbunden werden, starte Apple Music.","trigger.bluetooth-connected","REQUIRES_SHORTCUT_ACTION"],
 ["Wenn ich Instagram öffne, setze die Helligkeit auf 35 %.","trigger.app-opened","EXECUTABLE_DIRECT"],
 ["Wenn Akku unter 20 %, Stromsparmodus an.","trigger.battery-level","REQUIRES_SHORTCUT_ACTION"],
 ["Jeden Werktag um 7 Uhr Navigation zur Arbeit.","trigger.weekday","REQUIRES_SHORTCUT_ACTION"],
 ["Wenn ich zuhause ankomme, Fokus Arbeit aus.","trigger.location-enter","REQUIRES_SHORTCUT_ACTION"],
 ["Wenn Bluetooth mit meinem Auto verbunden, Maps und Spotify.","trigger.bluetooth-connected","REQUIRES_SHORTCUT_ACTION"]
] as const;
for(const [goal,trigger,mode] of scenarios)test(`materializes honestly: ${goal}`,()=>{const item=materialize(goal);assert.equal(item.personalSetup?.appleTriggerType,trigger);assert.equal(actionExecutionMode(item.definition.actions[0]!),mode);assert.notEqual(item.materializationState,"ACTIVE");assert.equal(item.personalSetup?.setupState,"NOT_STARTED");});
test("manual brightness is directly executable without Apple automation",()=>{const item=materialize("Setze Helligkeit auf 35 %.");assert.equal(item.definition.trigger.capabilityId,"trigger.manual");assert.equal(item.personalSetup,undefined);assert.equal(actionExecutionMode(item.definition.actions[0]!),"EXECUTABLE_DIRECT");});
test("iOS 27 handoff description gives Shortcuts the trigger and CanMyPhone action",()=>{const definition=compileShortcutGoal("Wenn ich Instagram öffne, setze die Helligkeit auf 35 %.");const prompt=buildAppleIntelligenceAutomationDescription(definition);assert.match(prompt,/persönliche Automation/i);assert.match(prompt,/Instagram/);assert.match(prompt,/35 Prozent/);assert.match(prompt,/CanMyPhone Automation ausführen/);});
test("materialized personal automations can track an Apple Intelligence handoff",()=>{const item=materialize("Wenn ich Instagram öffne, setze die Helligkeit auf 35 %.");assert.equal(item.personalSetup?.handoffMode,undefined);const updated={...item,personalSetup:item.personalSetup?{...item.personalSetup,handoffMode:"APPLE_INTELLIGENCE" as const}:undefined};assert.equal(updated.personalSetup?.handoffMode,"APPLE_INTELLIGENCE");});


function runnable(goal="Setze Helligkeit auf 35 %."){const item=materialize(goal);return {...item,enabled:true,materializationState:"ACTIVE" as const};}
const context={pro:true,grantedPermissions:new Set<string>(),connectedIntegrations:new Set<string>()};
test("runner executes a valid allow-listed direct automation",async()=>{const calls:string[]=[];const r=await runStoredAutomation(runnable(),context,async id=>{calls.push(id);return true;});assert.equal(r.status,"SUCCESS");assert.deepEqual(calls,["system.brightness.set"]);});
test("runner blocks missing Pro, permissions and integrations",async()=>{const exec=async()=>true;assert.equal((await runStoredAutomation({...runnable(),requiresPro:true},{...context,pro:false},exec)).status,"BLOCKED_ENTITLEMENT");assert.equal((await runStoredAutomation({...runnable(),requiredSetup:["location"]},context,exec)).status,"BLOCKED_PERMISSION");assert.equal((await runStoredAutomation({...runnable(),integrations:["spotify"],requiredSetup:["spotify"]},context,exec)).status,"BLOCKED_INTEGRATION");});
test("runner never reports a Shortcuts-only action as success",async()=>{const item=runnable("Wenn Akku unter 20 %, Stromsparmodus an.");const r=await runStoredAutomation(item,context,async()=>true);assert.equal(r.status,"UNSUPPORTED_ACTION");assert.equal(r.errorCode,"SHORTCUT_ACTION_REQUIRED");});
test("runner handles multi-step stop and best effort deterministically",async()=>{const item=runnable();item.definition.actions=[...item.definition.actions,{...item.definition.actions[0]!,parameters:{percent:45}}];item.failurePolicy="STOP";let count=0;let r=await runStoredAutomation(item,context,async()=>++count!==1);assert.equal(r.status,"FAILED");assert.equal(count,1);item.failurePolicy="BEST_EFFORT";count=0;r=await runStoredAutomation(item,context,async()=>++count!==1);assert.equal(r.status,"PARTIAL_SUCCESS");assert.equal(count,2);});
test("unknown capability and arbitrary URL never execute",async()=>{const item=runnable();item.definition.actions=[{capabilityId:"native.selector.perform",parameters:{}}];let called=false;const r=await runStoredAutomation(item,context,async()=>{called=true;return true;});assert.equal(r.status,"INVALID_DEFINITION");assert.equal(called,false);});
test("handoff lifecycle persists pending setup without claiming installation",async()=>{const storage=new MemoryStorage(),repo=new AutomationPersistence(storage),item=materialize(scenarios[0][0]);await repo.save(item);await repo.setPendingSetup(item.id);assert.equal(await repo.getPendingSetup(),item.id);assert.equal(item.personalSetup?.setupState,"NOT_STARTED");await repo.setPendingSetup(null);assert.equal(await repo.getPendingSetup(),null);});
test("sensitive approval is bound to the exact safety definition",()=>{const item=runnable("Wenn ich mich von meinem Tesla entferne, schließe den Heckkofferraum.");assert.equal(item.safetyApproval.required,true);assert.equal(hasValidSafetyApproval(item),false);const approved=approveSensitiveAutomation(item,new Date("2026-09-19T11:00:00Z"));assert.equal(hasValidSafetyApproval(approved),true);assert.equal(approved.safetyApproval.definitionFingerprint,safetyDefinitionFingerprint(approved));const edited={...approved,definition:{...approved.definition,conditions:[{capabilityId:"condition.time-window",parameters:{after:"22:00"}}]}};assert.equal(hasValidSafetyApproval(edited),false);});
test("sensitive runner requires a matching approval fingerprint",async()=>{const item=runnable("Wenn ich mich von meinem Tesla entferne, schließe den Heckkofferraum.");const ready={...context,grantedPermissions:new Set(["location"]),connectedIntegrations:new Set(["tesla"])};let result=await runStoredAutomation(item,ready,async()=>true);assert.equal(result.errorCode,"CONFIRMATION_REQUIRED");const approved=approveSensitiveAutomation(item);result=await runStoredAutomation(approved,ready,async()=>true);assert.equal(result.status,"UNSUPPORTED_ACTION");const mismatch={...approved,riskLevel:"medium" as const};result=await runStoredAutomation(mismatch,ready,async()=>true);assert.equal(result.errorCode,"CONFIRMATION_REQUIRED");});
test("runner snapshots update real last-run state and execution count",async()=>{const storage=new MemoryStorage(),repo=new AutomationPersistence(storage),item=runnable();await repo.save(item);const snapshot={...item,lastRunAt:"2026-09-19T12:00:00Z",lastRunStatus:"SUCCESS" as const,executionCount:3};const merged=await repo.mergeRunnerSnapshots([snapshot]);assert.equal(merged[0]?.executionCount,3);assert.equal(merged[0]?.lastRunStatus,"SUCCESS");assert.equal(merged[0]?.lastRunAt,snapshot.lastRunAt);});
test("deleted and disabled automations cannot run",async()=>{const storage=new MemoryStorage(),repo=new AutomationPersistence(storage),item=runnable();await repo.save(item);const disabled={...item,enabled:false};assert.equal((await runStoredAutomation(disabled,context,async()=>true)).errorCode,"AUTOMATION_DISABLED");await repo.remove(item.id);assert.equal(await repo.get(item.id),null);});
test("invalid ids, schemas and extra native parameters fail closed",async()=>{const item=runnable();assert.equal(validateStoredAutomation({...item,id:"bad/id"}),false);assert.equal(validateStoredAutomation({...item,version:99}),false);const invalid={...item,definition:{...item.definition,actions:[{capabilityId:"system.brightness.set",parameters:{percent:35,selector:"private"}}]}};assert.equal((await runStoredAutomation(invalid,context,async()=>true)).status,"INVALID_DEFINITION");});
test("Pro transitions are evaluated per run, including restore and expiry",async()=>{const item={...runnable(),requiresPro:true};assert.equal((await runStoredAutomation(item,{...context,pro:false},async()=>true)).status,"BLOCKED_ENTITLEMENT");assert.equal((await runStoredAutomation(item,{...context,pro:true},async()=>true)).status,"SUCCESS");assert.equal((await runStoredAutomation(item,{...context,pro:false},async()=>true)).status,"BLOCKED_ENTITLEMENT");});

test("engine keeps TikTok app-open as trigger-only Apple bridge",()=>{
  const d=compileShortcutGoal("Wenn TikTok geöffnet wird, Helligkeit auf 100 %.");
  const runtime=compileAutomationRuntime(d);
  assert.equal(runtime.triggerDriver,"APPLE_SHORTCUTS_BRIDGE");
  assert.deepEqual(runtime.actionDrivers,["CANMYPHONE_NATIVE"]);
  assert.equal(runtime.appleBridgePurpose,"TRIGGER_ONLY");
  assert.equal(runtime.canmyphoneOwnsAllActions,true);
});
test("engine keeps manual brightness fully inside CanMyPhone",()=>{
  const d=compileShortcutGoal("Setze Helligkeit auf 35 %.");
  const runtime=compileAutomationRuntime(d);
  assert.equal(runtime.triggerDriver,"CANMYPHONE_MANUAL");
  assert.equal(runtime.appleBridgeRequired,false);
  assert.equal(runtime.canmyphoneOwnsAllActions,true);
});
test("engine reports Apple-owned actions honestly",()=>{
  const d=compileShortcutGoal("Wenn Akku unter 20 %, Stromsparmodus an.");
  const runtime=compileAutomationRuntime(d);
  assert.equal(runtime.appleBridgePurpose,"TRIGGER_AND_ACTIONS");
  assert.equal(runtime.actionDrivers[0],"APPLE_SHORTCUTS_ACTION");
  assert.equal(runtime.canmyphoneOwnsAllActions,false);
});

test("materialization stores a concise display name but keeps the original intent summary",()=>{
  const goal="Wenn Instagram geöffnet wird, setze die Helligkeit auf 35 %.";
  const item=materialize(goal);
  assert.equal(item.name,"Instagram → Helligkeit 35 %");
  assert.match(item.originalIntentSummary,/Instagram/);
});


test("runner executes provider-neutral Tesla actions through the connector runtime",async()=>{
  const semantic=acceptSemanticAutomationOutput("Tesla verriegeln",JSON.stringify({
    kind:"automation",confidence:0.99,
    trigger:{capabilityId:"trigger.manual",parameters:{}},
    actions:[{capabilityId:"vehicle.lock",parameters:{brand:"Tesla"}}],
    clarificationQuestion:null,suggestion:null
  }));
  assert.equal(semantic.kind,"understood");
  if(semantic.kind!=="understood")return;
  let calls=0;
  const adapter=createTeslaConnectorAdapter({
    lockVehicle:async()=>{calls+=1;return {ok:true as const};},
    unlockVehicle:async()=>({ok:true as const})
  });
  const runtime=new ConnectorRuntime([adapter]);
  const materialized=materializeShortcutDefinition(semantic.definition);
  const active=approveSensitiveAutomation({...materialized,enabled:true,materializationState:"ACTIVE" as const});
  const result=await runStoredAutomation(active,{...context,connectedIntegrations:new Set(["tesla"]),connectorRuntime:runtime},async()=>true);
  assert.equal(result.status,"SUCCESS");
  assert.equal(calls,1);
});

test("runner executes Homematic IP actions without pretending they are iOS permissions",async()=>{
  const semantic=acceptSemanticAutomationOutput("Rollläden Wohnzimmer hoch",JSON.stringify({
    kind:"automation",confidence:0.99,
    trigger:{capabilityId:"trigger.manual",parameters:{}},
    actions:[{capabilityId:"smart-home.cover.open",parameters:{provider:"Homematic IP",room:"Wohnzimmer"}}],
    clarificationQuestion:null,suggestion:null
  }));
  assert.equal(semantic.kind,"understood");
  if(semantic.kind!=="understood")return;
  let room="";
  const adapter=createHomematicIPConnectorAdapter({
    openCover:async(value)=>{room=value;return {ok:true as const};},
    closeCover:async()=>({ok:true as const}),
    setLight:async()=>({ok:true as const}),
    setClimate:async()=>({ok:true as const})
  });
  const runtime=new ConnectorRuntime([adapter]);
  const item={...materializeShortcutDefinition(semantic.definition),enabled:true,materializationState:"ACTIVE" as const};
  assert.equal(item.requiredSetup.includes("provider-connection"),false);
  const result=await runStoredAutomation(item,{...context,connectedIntegrations:new Set(["homematic-ip"]),connectorRuntime:runtime},async()=>true);
  assert.equal(result.status,"SUCCESS");
  assert.equal(room,"Wohnzimmer");
});

test("connector failures are reported as real automation failures",async()=>{
  const semantic=acceptSemanticAutomationOutput("Tesla verriegeln",JSON.stringify({
    kind:"automation",confidence:0.99,
    trigger:{capabilityId:"trigger.manual",parameters:{}},
    actions:[{capabilityId:"vehicle.lock",parameters:{brand:"Tesla"}}],
    clarificationQuestion:null,suggestion:null
  }));
  assert.equal(semantic.kind,"understood");
  if(semantic.kind!=="understood")return;
  const runtime=new ConnectorRuntime([createTeslaConnectorAdapter({
    lockVehicle:async()=>({ok:false as const,code:"vehicle_offline",message:"Fahrzeug nicht erreichbar."}),
    unlockVehicle:async()=>({ok:true as const})
  })]);
  const item=approveSensitiveAutomation({...materializeShortcutDefinition(semantic.definition),enabled:true,materializationState:"ACTIVE" as const});
  const result=await runStoredAutomation(item,{...context,connectedIntegrations:new Set(["tesla"]),connectorRuntime:runtime},async()=>true);
  assert.equal(result.status,"FAILED");
  assert.equal(result.errorCode,"vehicle_offline");
  assert.match(result.humanMessage,/nicht erreichbar/i);
});


test("TikTok brightness automation has a zero-Shortcuts CanMyPhone launcher route",()=>{
  const d=compileShortcutGoal("Wenn TikTok geöffnet wird, Helligkeit auf 0 %.");
  const plan=launcherPlanForDefinition(d);
  assert.equal(plan.available,true);
  if(plan.available){
    assert.equal(plan.target.id,"tiktok");
    assert.equal(plan.target.universalUrl,"https://www.tiktok.com/");
  }
});

test("launcher route is not offered when an action still belongs to Apple Shortcuts",()=>{
  const d=compileShortcutGoal("Wenn Akku unter 20 %, Stromsparmodus an.");
  assert.equal(launcherPlanForDefinition(d).available,false);
});
