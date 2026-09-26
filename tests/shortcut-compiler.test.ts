import test from "node:test"; import assert from "node:assert/strict";
import { CAPABILITY_CATALOG_V2, capabilityV2 } from "../src/automation/capabilityCatalogV2";
import { compileShortcutGoal, relevantCatalogForGoal } from "../src/automation/shortcutCompiler";
import { validateShortcutDefinition } from "../src/automation/shortcutValidation";
const cases=[
 ["Wenn ich zuhause ankomme, schalte Fokus Arbeit aus.","trigger.location-enter",["system.focus.set"]],
 ["Wenn meine AirPods verbunden werden, starte Spotify.","trigger.bluetooth-connected",["media.spotify.open"]],
 ["Wenn mein Akku unter 20 % fällt, aktiviere Stromsparmodus.","trigger.battery-level",["system.low-power.set"]],
 ["Wenn ich das Fitnessstudio betrete, starte meine Trainingsplaylist.","trigger.location-enter",["media.playlist.play"]],
 ["Jeden Werktag um 7 Uhr Navigation zur Arbeit starten.","trigger.weekday",["navigation.route.start"]],
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

const paraphrases=[
 ["Sobald ich daheim eintreffe, Arbeits-Fokus deaktivieren.","trigger.location-enter","system.focus.set"],
 ["Bei Verbindung mit meinen AirPods soll Spotify losgehen.","trigger.bluetooth-connected","media.spotify.open"],
 ["Fällt die Batterie unter 20 %, Strom sparen einschalten.","trigger.battery-level","system.low-power.set"],
 ["Beim Betreten vom Fitnessstudio meine Trainingsplaylist abspielen.","trigger.location-enter","media.playlist.play"],
 ["Montag bis Freitag um 7 Uhr Route zur Arbeit öffnen.","trigger.weekday","navigation.route.start"],
 ["Sobald YouTube geöffnet wird, Helligkeit auf 25 %.","trigger.app-opened","system.brightness.set"],
 ["Beim Anschließen des Ladegeräts Stromsparmodus deaktivieren.","trigger.charger-connected","system.low-power.set"],
 ["Entferne ich mich vom Tesla, soll dessen Kofferraum schließen.","trigger.location-exit","tesla.rear-trunk.close"],
 ["Daheim nach 22 Uhr den Schlaf-Fokus einschalten.","trigger.location-enter","system.focus.set"],
 ["Verbindet sich Bluetooth mit meinem Auto, Maps plus Spotify starten.","trigger.bluetooth-connected","navigation.route.start"]
] as const;
for(const [goal,t,a] of paraphrases)test(`paraphrase: ${goal}`,()=>{const d=compileShortcutGoal(goal);assert.equal(d.trigger.capabilityId,t);assert.ok(d.actions.some(x=>x.capabilityId===a));});

const unseen=[
 ["Wenn meine Bose Kopfhörer verbunden werden, starte Apple Music.","trigger.bluetooth-connected","media.apple-music.play"],
 ["Wenn ich das Büro verlasse, starte Maps nach Hause.","trigger.location-exit","navigation.route.start"],
 ["Akku unter 15 %: Stromsparmodus an.","trigger.battery-level","system.low-power.set"],
 ["Wenn YouTube geöffnet wird, Helligkeit auf 25 %.","trigger.app-opened","system.brightness.set"],
 ["Montag bis Freitag um 18:30 eine Erinnerung erstellen.","trigger.weekday","productivity.reminder.create"],
 ["Wenn ich zuhause ankomme, HomeKit Szene Abend starten.","trigger.location-enter","smart-home.scene.run"],
 ["Wenn meine Bose Box getrennt wird, öffne YouTube App.","trigger.bluetooth-disconnected","system.app.open"],
 ["Wenn Fokus Arbeit aktiviert wird, Lautstärke auf 30 %.","trigger.focus-changed","system.volume.set"],
 ["Wenn TikTok geöffnet wird, Helligkeit auf 30 %.","trigger.app-opened","system.brightness.set"],
 ["Wenn ich Threads öffne, setze die Helligkeit auf 40 %.","trigger.app-opened","system.brightness.set"],
 ["Sobald Lightroom gestartet wird, Helligkeit auf 55 %.","trigger.app-opened","system.brightness.set"]
] as const;
for(const [goal,t,a] of unseen)test(`unseen: ${goal}`,()=>{const d=compileShortcutGoal(goal);assert.equal(d.trigger.capabilityId,t);assert.ok(d.actions.some(x=>x.capabilityId===a));});

test("definition validator rejects structural, role and safety lies",()=>{const valid=compileShortcutGoal(cases[5][0]);assert.equal(validateShortcutDefinition(valid).ok,true);const invalid=[
 {...valid,trigger:{capabilityId:"invented.trigger",parameters:{}}},
 {...valid,unknown:true},
 {...valid,actions:[{capabilityId:"system.brightness.set",parameters:{percent:"35"}}]},
 {...valid,actions:[{capabilityId:"system.brightness.set",parameters:{percent:101}}]},
 {...valid,actions:[{capabilityId:"system.brightness.set",parameters:{percent:-1}}]},
 {...valid,actions:[{capabilityId:"system.url.open",parameters:{scheme:"App-Prefs"}}]},
 {...valid,trigger:{capabilityId:"system.brightness.set",parameters:{percent:35}}},
 {...valid,actions:[{capabilityId:"trigger.app-opened",parameters:{value:"YouTube"}}]},
 {...valid,actions:[{capabilityId:"system.brightness.set",parameters:{}}]},
 {...valid,background:true,actions:[{capabilityId:"system.url.open",parameters:{scheme:"https"}}]},
 {...valid,feasibility:"FULLY_AUTOMATIC",requiredSetup:["location"]},
 {...compileShortcutGoal(cases[7][0]),integrations:[]},
 {...compileShortcutGoal(cases[7][0]),confirmationRequired:false},
 {...compileShortcutGoal(cases[7][0]),risk:"low"}
 ];for(const item of invalid)assert.equal(validateShortcutDefinition(item).ok,false);});
test("unknown app handoff is not invented",()=>{const d=compileShortcutGoal("Wenn meine Bose Box getrennt wird, öffne Fantasia App.");assert.equal(d.actions.length,0);assert.equal(d.confidence,0.3);assert.match(d.clarification??"",/Was soll/);});
test("arbitrary app names are preserved for app-open triggers",()=>{
  assert.equal(compileShortcutGoal("Wenn TikTok geöffnet wird, Helligkeit auf 30 %.").trigger.parameters.value,"TikTok");
  assert.equal(compileShortcutGoal("Wenn ich Threads öffne, Helligkeit auf 40 %.").trigger.parameters.value,"Threads");
  assert.equal(compileShortcutGoal("Sobald Lightroom gestartet wird, Helligkeit auf 55 %.").trigger.parameters.value,"Lightroom");
});
test("opening a known app manually is not mistaken for an app-open trigger",()=>{
  const d=compileShortcutGoal("Öffne Spotify.");
  assert.notEqual(d.trigger.capabilityId,"trigger.app-opened");
});
