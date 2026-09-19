import { capabilityV2, selectCapabilityCandidates, type Feasibility, type Strategy } from "./capabilityCatalogV2";
export type ShortcutStep={capabilityId:string;parameters:Record<string,string|number|boolean>};
export type ShortcutDefinition={name:string;trigger:ShortcutStep;conditions:ShortcutStep[];actions:ShortcutStep[];variables:Record<string,string>;integrations:string[];requiredSetup:string[];executionStrategy:Strategy;feasibility:Feasibility;confidence:number;clarification?:string};

function trigger(q:string):ShortcutStep|undefined {
  if(/zuhause.*ankomm|fitnessstudio.*betret/.test(q)) return {capabilityId:"trigger.location-enter",parameters:{value:q.includes("fitness")?"fitnessstudio":"home"}};
  if(/tesla.*entfern|zuhause.*bin/.test(q)) return {capabilityId:q.includes("tesla")?"trigger.location-exit":"trigger.location-enter",parameters:{value:q.includes("tesla")?"parked-vehicle-location":"home"}};
  if(/airpods.*verbunden|bluetooth.*auto.*verbind/.test(q)) return {capabilityId:"trigger.bluetooth-connected",parameters:{value:q.includes("airpods")?"AirPods":"car"}};
  if(/akku.*unter/.test(q)) return {capabilityId:"trigger.battery-level",parameters:{value:Number(q.match(/(\d+)\s*%/)?.[1]??20)}};
  if(/werktag.*\d+\s*uhr/.test(q)) return {capabilityId:"trigger.time",parameters:{value:q.match(/\d+\s*uhr/)?.[0]??"07:00"}};
  if(/instagram.*öffne/.test(q)) return {capabilityId:"trigger.app-opened",parameters:{value:"Instagram"}};
  if(/ladegerät.*anschlie/.test(q)) return {capabilityId:"trigger.charger-connected",parameters:{value:"connected"}};
}
function actions(q:string):ShortcutStep[]{const out:ShortcutStep[]=[];
  if(/fokus arbeit aus/.test(q)) out.push({capabilityId:"system.focus.set",parameters:{value:"work:off"}});
  if(/schlaf.?fokus/.test(q)) out.push({capabilityId:"system.focus.set",parameters:{value:"sleep:on"}});
  if(/navigation|maps/.test(q)) out.push({capabilityId:"navigation.route.start",parameters:{destination:/arbeit/.test(q)?"work":"selected"}});
  if(/spotify/.test(q)) out.push({capabilityId:"media.spotify.open",parameters:{value:"open"}});
  if(/trainingsplaylist/.test(q)) out.push({capabilityId:"media.playlist.play",parameters:{value:"training"}});
  if(/stromsparmodus/.test(q)) out.push({capabilityId:"system.low-power.set",parameters:{value:/ aus/.test(q)?"off":"on"}});
  if(/helligkeit/.test(q)) out.push({capabilityId:"system.brightness.set",parameters:{percent:Number(q.match(/(\d+)\s*%/)?.[1]??-1)}});
  if(/tesla/.test(q)&&/(heck|kofferraum)/.test(q)) out.push({capabilityId:"tesla.rear-trunk.close",parameters:{expectedState:"open"}});
  return out;
}
const rank:Strategy[]=["DIRECT_PUBLIC_API","APP_INTENT","SHORTCUT","PERSONAL_AUTOMATION","THIRD_PARTY_API","GUIDED_HANDOFF","UNSUPPORTED"];
export function resolveStrategy(steps:ShortcutStep[]):Strategy { const modes=steps.flatMap(s=>capabilityV2(s.capabilityId)?.executionModes??["UNSUPPORTED" as Strategy]); return rank.find(m=>modes.includes(m))??"UNSUPPORTED"; }
export function compileShortcutGoal(goal:string):ShortcutDefinition {
  const q=goal.toLowerCase(); const t=trigger(q); const a=actions(q); let clarification:string|undefined;
  if(!t) clarification=/musik.*auto|einsteige/.test(q)?"Woran soll ich erkennen, dass du im Auto bist: CarPlay, Bluetooth oder Standort?":"Wann soll die Automation starten?";
  else if(!a.length) clarification="Was soll dann passieren?";
  const conditions:ShortcutStep[]=[]; if(/nach 22 uhr/.test(q)) conditions.push({capabilityId:"condition.time-window",parameters:{after:"22:00"}});
  const all=[...(t?[t]:[]),...conditions,...a]; const integrations=[...new Set(all.map(s=>capabilityV2(s.capabilityId)?.integration).filter((x):x is string=>Boolean(x)))];
  const setup=[...new Set(all.flatMap(s=>capabilityV2(s.capabilityId)?.permissions??[]).concat(integrations))];
  const pro=all.some(s=>capabilityV2(s.capabilityId)?.requiresPro); const third=integrations.includes("tesla");
  const feasibility:Feasibility=clarification?"UNSUPPORTED":third?"REQUIRES_THIRD_PARTY":setup.length?"ONE_TIME_SETUP":t?.capabilityId.startsWith("trigger.")?"PARTIALLY_AUTOMATIC":"FULLY_AUTOMATIC";
  const complete=Boolean(t&&a.length&&a.every(s=>capabilityV2(s.capabilityId)));
  return {name:goal.slice(0,80),trigger:t??{capabilityId:"trigger.manual",parameters:{}},conditions,actions:a,variables:{},integrations,requiredSetup:setup,executionStrategy:resolveStrategy(all),feasibility,confidence:complete?(conditions.length||a.length>1?0.92:0.88):0.3,...(clarification?{clarification}:{}),...(pro?{variables:{entitlement:"pro"}}:{})};
}
export function relevantCatalogForGoal(goal:string){return selectCapabilityCandidates(goal).map(({id,role,executionModes,parameters,permissions,background,confirmation,risk})=>({id,role,executionModes,parameters,permissions,background,confirmation,risk}));}
