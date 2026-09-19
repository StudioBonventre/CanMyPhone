import test from "node:test"; import assert from "node:assert/strict";
import { CAPABILITY_CATALOG_V2, capabilityV2 } from "../src/automation/capabilityCatalogV2";
import { compileShortcutGoal, relevantCatalogForGoal } from "../src/automation/shortcutCompiler";
const cases=[
 ["Wenn ich zuhause ankomme, schalte Fokus Arbeit aus.","trigger.location-enter",["system.focus.set"]],
 ["Wenn meine AirPods verbunden werden, starte Spotify.","trigger.bluetooth-connected",["media.spotify.open"]],
 ["Wenn mein Akku unter 20 % fällt, aktiviere Stromsparmodus.","trigger.battery-level",["system.low-power.set"]],
 ["Wenn ich das Fitnessstudio betrete, starte meine Trainingsplaylist.","trigger.location-enter",["media.playlist.play"]],
 ["Jeden Werktag um 7 Uhr Navigation zur Arbeit starten.","trigger.time",["navigation.route.start"]],
 ["Wenn ich Instagram öffne, setze die Helligkeit auf 35 %.","trigger.app-opened",["system.brightness.set"]],
 ["Wenn ich mein Ladegerät anschließe, schalte Stromsparmodus aus.","trigger.charger-connected",["system.low-power.set"]],
 ["Wenn ich mich von meinem Tesla entferne, schließe den Heckkofferraum.","trigger.location-exit",["tesla.rear-trunk.close"]],
 ["Wenn ich zuhause bin und es nach 22 Uhr ist, aktiviere Schlaf-Fokus.","trigger.location-enter",["system.focus.set"]],
 ["Wenn ich Bluetooth mit meinem Auto verbinde, öffne Maps und Spotify.","trigger.bluetooth-connected",["navigation.route.start","media.spotify.open"]]
] as const;
for(const [goal,trigger,actions] of cases)test(`generic compiler: ${goal}`,()=>{const d=compileShortcutGoal(goal);assert.equal(d.trigger.capabilityId,trigger);assert.deepEqual(d.actions.map(a=>a.capabilityId),actions);assert.ok(!d.clarification);assert.ok(d.confidence>=0.8);for(const step of [d.trigger,...d.conditions,...d.actions])assert.ok(capabilityV2(step.capabilityId));});
test("time condition and multi-step composition are preserved",()=>{assert.equal(compileShortcutGoal(cases[8][0]).conditions[0]?.capabilityId,"condition.time-window");assert.equal(compileShortcutGoal(cases[9][0]).actions.length,2);});
test("ambiguous car music asks one concrete question",()=>{const d=compileShortcutGoal("Starte Musik wenn ich ins Auto steige");assert.match(d.clarification??"",/CarPlay, Bluetooth oder Standort/);assert.equal(d.feasibility,"UNSUPPORTED");});
test("candidate selection is smaller than catalog and relevant",()=>{const selected=relevantCatalogForGoal("AirPods verbunden Spotify starten");assert.ok(selected.length<CAPABILITY_CATALOG_V2.length);assert.ok(selected.some(c=>c.id==="media.spotify.open"));});
test("catalog IDs are unique and safety metadata is complete",()=>{assert.equal(new Set(CAPABILITY_CATALOG_V2.map(c=>c.id)).size,CAPABILITY_CATALOG_V2.length);for(const c of CAPABILITY_CATALOG_V2){assert.ok(c.executionModes.length);assert.ok(c.fallback);assert.ok(c.availability);}});
test("URL capability allow-lists documented schemes and foreground execution",()=>{const c=capabilityV2("system.url.open")!;assert.deepEqual(c.parameters.scheme.values,["https","http","maps"]);assert.equal(c.background,false);assert.equal(c.confirmation,true);});
test("third-party and multi-condition plans cannot masquerade as free fully automatic work",()=>{const tesla=compileShortcutGoal(cases[7][0]);const conditioned=compileShortcutGoal(cases[8][0]);assert.equal(tesla.feasibility,"REQUIRES_THIRD_PARTY");assert.equal(tesla.variables.entitlement,"pro");assert.notEqual(conditioned.feasibility,"FULLY_AUTOMATIC");assert.equal(conditioned.variables.entitlement,"pro");});
