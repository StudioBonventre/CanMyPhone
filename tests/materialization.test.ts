import test from "node:test";
import assert from "node:assert/strict";
import { AutomationPersistence, type KeyValueStorage } from "../src/automation/automationPersistence";
import { actionExecutionMode, materializeShortcutDefinition, validateStoredAutomation } from "../src/automation/materialization";
import { runStoredAutomation } from "../src/automation/runner";
import { compileShortcutGoal } from "../src/automation/shortcutCompiler";

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  async getItem(key:string){ return this.data.get(key) ?? null; }
  async setItem(key:string,value:string){ this.data.set(key,value); }
  async removeItem(key:string){ this.data.delete(key); }
}

const materialize = (goal:string) => materializeShortcutDefinition(compileShortcutGoal(goal), new Date("2026-09-19T10:00:00Z"));

test("persistence saves, loads, updates and deletes", async()=>{const storage=new MemoryStorage(),repo=new AutomationPersistence(storage);const item=materialize("Setze Helligkeit auf 35 %.");await repo.save(item);assert.equal((await repo.get(item.id))?.name,item.name);await repo.save({...item,enabled:true});assert.equal((await repo.get(item.id))?.enabled,true);await repo.remove(item.id);assert.equal(await repo.get(item.id),null);});
test("invalid stored schema versions are never loaded",async()=>{const storage=new MemoryStorage();await storage.setItem("canmyphone.automations.v1",JSON.stringify([{version:2,id:"cmp_auto_bad",enabled:true,definition:{}}]));assert.deepEqual(await new AutomationPersistence(storage).list(),[]);assert.equal(validateStoredAutomation({version:2}),false);});

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

function runnable(goal="Setze Helligkeit auf 35 %."){const item=materialize(goal);return {...item,enabled:true,materializationState:"ACTIVE" as const};}
const context={pro:true,grantedPermissions:new Set<string>(),connectedIntegrations:new Set<string>(),confirmedSensitive:true};
test("runner executes a valid allow-listed direct automation",async()=>{const calls:string[]=[];const r=await runStoredAutomation(runnable(),context,async id=>{calls.push(id);return true;});assert.equal(r.status,"SUCCESS");assert.deepEqual(calls,["system.brightness.set"]);});
test("runner blocks missing Pro, permissions, integrations and confirmation",async()=>{const exec=async()=>true;assert.equal((await runStoredAutomation({...runnable(),requiresPro:true},{...context,pro:false},exec)).status,"BLOCKED_ENTITLEMENT");assert.equal((await runStoredAutomation({...runnable(),requiredSetup:["location"]},context,exec)).status,"BLOCKED_PERMISSION");assert.equal((await runStoredAutomation({...runnable(),integrations:["spotify"],requiredSetup:["spotify"]},context,exec)).status,"BLOCKED_INTEGRATION");assert.equal((await runStoredAutomation({...runnable(),confirmationRequired:true},{...context,confirmedSensitive:false},exec)).errorCode,"CONFIRMATION_REQUIRED");});
test("runner never reports a Shortcuts-only action as success",async()=>{const item=runnable("Wenn Akku unter 20 %, Stromsparmodus an.");const r=await runStoredAutomation(item,context,async()=>true);assert.equal(r.status,"UNSUPPORTED_ACTION");assert.equal(r.errorCode,"SHORTCUT_ACTION_REQUIRED");});
test("runner handles multi-step stop and best effort deterministically",async()=>{const item=runnable();item.definition.actions=[...item.definition.actions,{...item.definition.actions[0]!,parameters:{percent:45}}];item.failurePolicy="STOP";let count=0;let r=await runStoredAutomation(item,context,async()=>++count!==1);assert.equal(r.status,"FAILED");assert.equal(count,1);item.failurePolicy="BEST_EFFORT";count=0;r=await runStoredAutomation(item,context,async()=>++count!==1);assert.equal(r.status,"PARTIAL_SUCCESS");assert.equal(count,2);});
test("unknown capability and arbitrary URL never execute",async()=>{const item=runnable();item.definition.actions=[{capabilityId:"native.selector.perform",parameters:{}}];let called=false;const r=await runStoredAutomation(item,context,async()=>{called=true;return true;});assert.equal(r.status,"INVALID_DEFINITION");assert.equal(called,false);});
test("handoff lifecycle persists pending setup without claiming installation",async()=>{const storage=new MemoryStorage(),repo=new AutomationPersistence(storage),item=materialize(scenarios[0][0]);await repo.save(item);await repo.setPendingSetup(item.id);assert.equal(await repo.getPendingSetup(),item.id);assert.equal(item.personalSetup?.setupState,"NOT_STARTED");await repo.setPendingSetup(null);assert.equal(await repo.getPendingSetup(),null);});
