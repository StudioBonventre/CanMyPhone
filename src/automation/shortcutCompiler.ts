import { capabilityV2, selectCapabilityCandidates, type CapabilityV2, type Feasibility, type Strategy } from "./capabilityCatalogV2";

export type ExtractedEntities={app?:string;bluetoothDevice?:string;location?:string;time?:string;weekdays?:string;percent?:number;focus?:string;playlist?:string;destination?:string;contact?:string;homeScene?:string};
export type ShortcutStep={capabilityId:string;parameters:Record<string,string|number|boolean>};
export type ShortcutDefinition={name:string;trigger:ShortcutStep;conditions:ShortcutStep[];actions:ShortcutStep[];variables:Record<string,string>;integrations:string[];requiredSetup:string[];executionStrategy:Strategy;feasibility:Feasibility;reasons:string[];confidence:number;risk:"low"|"medium"|"high";confirmationRequired:boolean;background:boolean;clarification?:string};

const appAliases:Record<string,string>={spotify:"Spotify",instagram:"Instagram",youtube:"YouTube",maps:"Maps","apple music":"Apple Music",musik:"Apple Music"};

function canonicalAppName(value:string):string {
  const cleaned=value.replace(/^(?:die\s+)?app\s+/i,"").replace(/\s+/g," ").trim();
  const known=appAliases[cleaned.toLowerCase()];
  return known ?? cleaned;
}

function extractAppTriggerName(goal:string):string|undefined {
  const patterns=[
    /(?:wenn|sobald|falls|immer\s+wenn)\s+ich\s+(?:die\s+app\s+)?([\p{L}\p{N}][\p{L}\p{N} .+&'_-]{0,60}?)\s+(?:öffne|starte)\b/iu,
    /(?:wenn|sobald|falls|immer\s+wenn)\s+(?:die\s+app\s+)?([\p{L}\p{N}][\p{L}\p{N} .+&'_-]{0,60}?)\s+(?:geöffnet|gestartet)\s+wird\b/iu,
    /beim\s+öffnen\s+(?:der\s+app\s+)?(?:von\s+)?([\p{L}\p{N}][\p{L}\p{N} .+&'_-]{0,60}?)(?:\s*,|\s+dann\b|\s+soll\b|$)/iu
  ];
  for(const pattern of patterns){
    const match=goal.match(pattern);
    const candidate=match?.[1]?.trim();
    if(candidate)return canonicalAppName(candidate);
  }
}

function hasAppTriggerLanguage(q:string):boolean {
  return /(?:wenn|sobald|falls|immer wenn).{0,90}(?:öffne|geöffnet wird|starte|gestartet wird)/.test(q) || /beim öffnen/.test(q);
}
const riskRank={low:0,medium:1,high:2} as const;
const riskByRank=["low","medium","high"] as const;
const normalize=(s:string)=>s.toLowerCase().replace(/[.,!?]/g," ").replace(/\s+/g," ").trim();

export function extractEntities(goal:string):ExtractedEntities {
  const q=normalize(goal); const entities:ExtractedEntities={};
  const percent=q.match(/(\d{1,3})\s*%/); if(percent)entities.percent=Number(percent[1]);
  const time=q.match(/(?:um|nach)\s*(\d{1,2})(?::(\d{2}))?\s*(?:uhr)?/); if(time)entities.time=`${time[1].padStart(2,"0")}:${time[2]??"00"}`;
  if(/montag bis freitag|werktag/.test(q))entities.weekdays="weekdays";
  const triggeredApp=extractAppTriggerName(goal);
  if(triggeredApp)entities.app=triggeredApp;
  else for(const [alias,name] of Object.entries(appAliases))if(q.includes(alias))entities.app=name;
  const device=q.match(/(?:mit\s+meine[mn]?|meine[nr]?)\s+([a-z0-9äöüß -]+?)\s+(?:per bluetooth\s+)?(?:verbind|verbunden|getrennt)/); if(device)entities.bluetoothDevice=device[1].trim();
  if(!entities.bluetoothDevice&&/airpods/.test(q))entities.bluetoothDevice="AirPods"; if(!entities.bluetoothDevice&&/bose/.test(q))entities.bluetoothDevice=q.includes("box")?"Bose Box":"Bose Kopfhörer"; if(!entities.bluetoothDevice&&/bluetooth.*auto|auto.*bluetooth/.test(q))entities.bluetoothDevice="car";
  if(/tesla/.test(q)&&/entfern|verlass/.test(q))entities.location="parked-vehicle-location"; else if(/zuhause|zu hause|daheim/.test(q))entities.location="home"; else if(/büro|arbeit verlasse/.test(q))entities.location="work"; else if(/fitnessstudio|studio betrete/.test(q))entities.location="fitnessstudio";
  const focus=q.match(/(?:fokus|focus)\s+([a-zäöüß]+)/); if(focus)entities.focus=focus[1];
  const reversedFocus=q.match(/([a-zäöüß]+)[- ](?:fokus|focus)/); if(!entities.focus&&reversedFocus)entities.focus=reversedFocus[1];
  const playlist=q.match(/(?:meine[rn]?\s+)?([a-zäöüß -]*playlist)/); if(playlist)entities.playlist=playlist[1].trim();
  if(/nach hause|zurück nach hause/.test(q))entities.destination="home"; else if(/zur arbeit|navigation.*arbeit/.test(q))entities.destination="work";
  const scene=q.match(/(?:homekit\s+)?szene\s+([a-zäöüß0-9 -]+)/); if(scene)entities.homeScene=scene[1].trim();
  return entities;
}

function extractTrigger(q:string,e:ExtractedEntities):ShortcutStep|undefined {
  if(/ankomm|betret|eintreff|bin und|daheim nach/.test(q)&&e.location)return {capabilityId:"trigger.location-enter",parameters:{value:e.location}};
  if(/verlass|entfern|weggeh/.test(q)&&e.location)return {capabilityId:"trigger.location-exit",parameters:{value:e.location}};
  if(/getrennt/.test(q)&&e.bluetoothDevice)return {capabilityId:"trigger.bluetooth-disconnected",parameters:{value:e.bluetoothDevice}};
  if(/verbind|verbunden/.test(q)&&(/bluetooth|kopfhörer|airpods|bose|auto/.test(q)))return e.bluetoothDevice?{capabilityId:"trigger.bluetooth-connected",parameters:{value:e.bluetoothDevice}}:undefined;
  if(/akku|batter/.test(q)&&e.percent!==undefined)return {capabilityId:"trigger.battery-level",parameters:{value:e.percent}};
  if(/ladegerät|charger/.test(q))return {capabilityId:/trenn|abzieh/.test(q)?"trigger.charger-disconnected":"trigger.charger-connected",parameters:{value:/trenn|abzieh/.test(q)?"disconnected":"connected"}};
  if(e.app&&hasAppTriggerLanguage(q))return {capabilityId:"trigger.app-opened",parameters:{value:e.app}};
  if(e.time)return {capabilityId:e.weekdays?"trigger.weekday":"trigger.time",parameters:{value:e.weekdays?`${e.weekdays}@${e.time}`:e.time}};
  if(/fokus|focus/.test(q)&&/aktiviert wird|geändert wird|eingeschaltet wird/.test(q)&&e.focus)return {capabilityId:"trigger.focus-changed",parameters:{value:`${e.focus}:on`}};
}

function extractActions(q:string,e:ExtractedEntities):ShortcutStep[]{const out:ShortcutStep[]=[];
  if(/fokus|focus/.test(q)&&/(aus|deaktiv|an|aktiv|einschalt)/.test(q)&&e.focus)out.push({capabilityId:"system.focus.set",parameters:{value:`${e.focus}:${/(aus|deaktiv)/.test(q)?"off":"on"}`}});
  if(/helligkeit/.test(q)&&e.percent!==undefined)out.push({capabilityId:"system.brightness.set",parameters:{percent:e.percent}});
  if(/lautstärke/.test(q)&&e.percent!==undefined)out.push({capabilityId:"system.volume.set",parameters:{value:String(e.percent)}});
  if(/stromsparmodus|strom sparen/.test(q))out.push({capabilityId:"system.low-power.set",parameters:{value:/(aus|deaktiv)/.test(q)?"off":"on"}});
  if(/navigation|route|maps/.test(q))out.push({capabilityId:"navigation.route.start",parameters:{destination:e.destination??"selected"}});
  if(e.homeScene)out.push({capabilityId:"smart-home.scene.run",parameters:{scene:e.homeScene}});
  if(e.playlist)out.push({capabilityId:"media.playlist.play",parameters:{value:e.playlist}});
  else if(/spotify/.test(q))out.push({capabilityId:"media.spotify.open",parameters:{value:"open"}});
  else if(/apple music|musik/.test(q)&&/(start|spiel|losgeh)/.test(q))out.push({capabilityId:"media.apple-music.play",parameters:{value:""}});
  if(/erinnerung/.test(q))out.push({capabilityId:"productivity.reminder.create",parameters:{value:q.match(/erinnerung(?:\s+für)?\s+(.+)/)?.[1]??""}});
  if(/app öffnen|öffne app|öffne .+ app/.test(q)&&e.app)out.push({capabilityId:"system.app.open",parameters:{value:e.app}});
  if(/tesla/.test(q)&&/(heck|kofferraum)/.test(q))out.push({capabilityId:"tesla.rear-trunk.close",parameters:{expectedState:"open"}});
  return out;
}

export function resolveStrategy(steps:ShortcutStep[]):Strategy {
  const caps=steps.map(s=>capabilityV2(s.capabilityId)); if(caps.some(c=>!c))return "UNSUPPORTED";
  if(caps.some(c=>c!.integration&&c!.executionModes.includes("THIRD_PARTY_API")))return "THIRD_PARTY_API";
  if(caps.some(c=>c!.role==="trigger"&&c!.executionModes.includes("PERSONAL_AUTOMATION")))return "PERSONAL_AUTOMATION";
  if(caps.every(c=>c!.executionModes.includes("DIRECT_PUBLIC_API")))return "DIRECT_PUBLIC_API";
  if(caps.every(c=>c!.executionModes.some(m=>m==="APP_INTENT"||m==="DIRECT_PUBLIC_API")))return "APP_INTENT";
  if(caps.every(c=>c!.executionModes.some(m=>m==="SHORTCUT"||m==="APP_INTENT"||m==="DIRECT_PUBLIC_API")))return "SHORTCUT";
  return caps.some(c=>c!.fallback==="GUIDED_HANDOFF")?"GUIDED_HANDOFF":"UNSUPPORTED";
}

function assess(steps:ShortcutStep[],strategy:Strategy){const caps=steps.map(s=>capabilityV2(s.capabilityId)).filter((c):c is CapabilityV2=>Boolean(c));const reasons:string[]=[];
  if(strategy==="UNSUPPORTED")return {feasibility:"UNSUPPORTED" as Feasibility,reasons:["Mindestens ein Schritt wird nicht unterstützt."]};
  if(caps.some(c=>c.integration)){reasons.push("Eine externe Integration muss verbunden werden.");return {feasibility:"REQUIRES_THIRD_PARTY" as Feasibility,reasons};}
  if(strategy==="GUIDED_HANDOFF"){reasons.push("iOS verlangt einen geführten Schritt.");return {feasibility:"GUIDED_ONLY" as Feasibility,reasons};}
  if(caps.some(c=>!c.background||c.confirmation)){reasons.push("Mindestens ein Schritt benötigt Nutzerinteraktion oder Vordergrund.");return {feasibility:"PARTIALLY_AUTOMATIC" as Feasibility,reasons};}
  if(strategy==="PERSONAL_AUTOMATION"||caps.some(c=>c.permissions.length)){reasons.push("Die persönliche Automation oder Berechtigung muss einmalig eingerichtet werden.");return {feasibility:"ONE_TIME_SETUP" as Feasibility,reasons};}
  return {feasibility:"FULLY_AUTOMATIC" as Feasibility,reasons:["Alle Schritte können nach Aktivierung ohne weitere Interaktion laufen."]};}

export function compileShortcutGoal(goal:string):ShortcutDefinition {const q=normalize(goal),e=extractEntities(goal);let t=extractTrigger(q,e);const a=extractActions(q,e);let clarification:string|undefined;
  const asksForTrigger=/(wenn|sobald|falls|jed(en|e)|immer wenn|bei verbind|beim|akku|batter|um \d|werktag)/.test(q);
  if(!t&&a.length&&!asksForTrigger)t={capabilityId:"trigger.manual",parameters:{}};
  if(!t)clarification=/einsteige|ins auto/.test(q)?"Woran soll ich erkennen, dass du im Auto bist: CarPlay, Bluetooth oder Standort?":/bluetooth|kopfhörer/.test(q)&&/musik|spotify|apple music/.test(q)?"Welches Bluetooth-Gerät soll die Automation auslösen – oder reicht jedes?":"Wann soll die Automation starten?";
  else if(!a.length)clarification="Was soll dann passieren?";
  const conditions:ShortcutStep[]=[];if(/nach\s+\d{1,2}/.test(q)&&e.time&&t?.capabilityId!=="trigger.time"&&t?.capabilityId!=="trigger.weekday")conditions.push({capabilityId:"condition.time-window",parameters:{after:e.time}});
  const steps=[...(t?[t]:[]),...conditions,...a],caps=steps.map(s=>capabilityV2(s.capabilityId)).filter((c):c is CapabilityV2=>Boolean(c));const strategy=resolveStrategy(steps),assessment=assess(steps,strategy);
  const integrations=[...new Set(caps.map(c=>c.integration).filter((x):x is string=>Boolean(x)))],requiredSetup=[...new Set(caps.flatMap(c=>c.permissions).concat(integrations))];const risk=riskByRank[Math.max(0,...caps.map(c=>riskRank[c.risk]))];
  const complete=Boolean(t&&a.length&&caps.length===steps.length&&!clarification),variables:Record<string,string>=caps.some(c=>c.requiresPro)?{entitlement:"pro"}:{};return {name:goal.slice(0,80),trigger:t??{capabilityId:"trigger.manual",parameters:{}},conditions,actions:a,variables,integrations,requiredSetup,executionStrategy:strategy,feasibility:clarification?"UNSUPPORTED":assessment.feasibility,reasons:clarification?["Eine semantisch notwendige Angabe fehlt."]:assessment.reasons,confidence:complete?Math.max(.82,1-(requiredSetup.length*.03)-(a.length>2?.05:0)):.3,risk,confirmationRequired:caps.some(c=>c.confirmation),background:caps.every(c=>c.background),...(clarification?{clarification}:{})};}

export function relevantCatalogForGoal(goal:string){return selectCapabilityCandidates(goal).map(({id,role,executionModes,parameters,permissions,background,confirmation,risk})=>({id,role,executionModes,parameters,permissions,background,confirmation,risk}));}
