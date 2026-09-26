export type CapabilityRole = "trigger" | "condition" | "action";
export type CapabilityCategory = "trigger"|"system"|"media"|"navigation"|"communication"|"productivity"|"smart-home"|"apps"|"third-party";
export type Strategy = "DIRECT_PUBLIC_API"|"APP_INTENT"|"SHORTCUT"|"PERSONAL_AUTOMATION"|"THIRD_PARTY_API"|"GUIDED_HANDOFF"|"UNSUPPORTED";
export type Feasibility = "FULLY_AUTOMATIC"|"ONE_TIME_SETUP"|"PARTIALLY_AUTOMATIC"|"REQUIRES_THIRD_PARTY"|"GUIDED_ONLY"|"UNSUPPORTED";
export type ParameterRule = { type:"string"|"number"|"boolean"; required:boolean; values?:readonly (string|number)[]; min?:number; max?:number };
export type CapabilityV2 = { id:string; category:CapabilityCategory; provider:string; role:CapabilityRole; description:string; executionModes:Strategy[]; risk:"low"|"medium"|"high"; requiresPro:boolean; publicApi:boolean; background:boolean; confirmation:boolean; permissions:string[]; integration?:string; parameters:Record<string,ParameterRule>; inputs:string[]; outputs:string[]; compatibleTriggers?:string[]; fallback:Strategy; availability:string };

const cap = (value:CapabilityV2) => value;
export const CAPABILITY_CATALOG_V2: readonly CapabilityV2[] = [
  cap({id:"trigger.manual",category:"trigger",provider:"shortcuts",role:"trigger",description:"Manuell gestarteter Kurzbefehl",executionModes:["SHORTCUT","APP_INTENT"],risk:"low",requiresPro:false,publicApi:true,background:false,confirmation:false,permissions:[],parameters:{},inputs:[],outputs:["event"],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  ...[
    "time","weekday","alarm","sleep",
    "location-enter","location-exit",
    "carplay-connected","carplay-disconnected",
    "email-received","message-received","transaction",
    "wifi-connected",
    "bluetooth-connected","bluetooth-disconnected",
    "apple-watch-workout",
    "nfc",
    "app-opened","app-closed",
    "airplane-mode-changed","focus-changed","low-power-mode-changed",
    "battery-level",
    "charger-connected","charger-disconnected",
    "sound-recognition",
    "app-intent"
  ].map((name)=>cap({
    id:`trigger.${name}`,
    category:"trigger",
    provider:"apple-shortcuts",
    role:"trigger",
    description:name,
    executionModes:["PERSONAL_AUTOMATION"],
    risk:name.startsWith("location")||name==="transaction"||name==="email-received"||name==="message-received"?"medium":"low",
    requiresPro:false,
    publicApi:true,
    background:true,
    confirmation:false,
    permissions:name.startsWith("location")?["location"]:[],
    parameters:{
      value:{
        type:name==="battery-level"?"number":"string",
        required:true,
        min:name==="battery-level"?0:undefined,
        max:name==="battery-level"?100:undefined
      }
    },
    inputs:[],
    outputs:["event"],
    fallback:"GUIDED_HANDOFF",
    availability:"ios"
  })),
  cap({id:"condition.time-window",category:"trigger",provider:"shortcuts",role:"condition",description:"Zeitfenster",executionModes:["SHORTCUT"],risk:"low",requiresPro:true,publicApi:true,background:true,confirmation:false,permissions:[],parameters:{after:{type:"string",required:true}},inputs:["date"],outputs:["boolean"],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  cap({id:"system.brightness.set",category:"system",provider:"ios",role:"action",description:"Helligkeit setzen",executionModes:["DIRECT_PUBLIC_API","SHORTCUT"],risk:"low",requiresPro:false,publicApi:true,background:true,confirmation:false,permissions:[],parameters:{percent:{type:"number",required:true,min:0,max:100}},inputs:[],outputs:[],fallback:"SHORTCUT",availability:"ios"}),
  ...["volume.set","low-power.set","flashlight.set","focus.set","app.open","clipboard.set"].map((name)=>cap({id:`system.${name}`,category:"system",provider:"apple-shortcuts",role:"action",description:name,executionModes:["SHORTCUT","PERSONAL_AUTOMATION"],risk:"low",requiresPro:false,publicApi:true,background:!name.includes("app.open"),confirmation:false,permissions:[],parameters:{value:{type:"string",required:true}},inputs:[],outputs:[],fallback:"GUIDED_HANDOFF",availability:"ios"})),
  cap({id:"system.url.open",category:"system",provider:"ios",role:"action",description:"Dokumentierte URL öffnen",executionModes:["APP_INTENT","SHORTCUT"],risk:"medium",requiresPro:false,publicApi:true,background:false,confirmation:true,permissions:[],parameters:{scheme:{type:"string",required:true,values:["https","http","maps"]}},inputs:[],outputs:[],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  ...["play-pause","playlist.play","apple-music.play","spotify.open"].map((name)=>cap({id:`media.${name}`,category:"media",provider:name.includes("spotify")?"spotify":"apple-media",role:"action",description:name,executionModes:name.includes("spotify")?["APP_INTENT","SHORTCUT"]:["SHORTCUT"],risk:"low",requiresPro:false,publicApi:true,background:true,confirmation:false,permissions:[],integration:name.includes("spotify")?"spotify":undefined,parameters:{value:{type:"string",required:name.includes("playlist")}},inputs:[],outputs:[],fallback:"GUIDED_HANDOFF",availability:"ios"})),
  cap({id:"navigation.route.start",category:"navigation",provider:"apple-maps",role:"action",description:"Route starten",executionModes:["SHORTCUT","APP_INTENT"],risk:"low",requiresPro:false,publicApi:true,background:false,confirmation:false,permissions:["location-when-in-use"],parameters:{destination:{type:"string",required:true}},inputs:[],outputs:[],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  ...["message.compose","mail.compose","call.start"].map((name)=>cap({id:`communication.${name}`,category:"communication",provider:"ios",role:"action",description:name,executionModes:["APP_INTENT","SHORTCUT"],risk:"medium",requiresPro:false,publicApi:true,background:false,confirmation:true,permissions:["contacts"],parameters:{recipient:{type:"string",required:true}},inputs:[],outputs:[],fallback:"GUIDED_HANDOFF",availability:"ios"})),
  ...["calendar.create","reminder.create","note.create","file.save","text.transform"].map((name)=>cap({id:`productivity.${name}`,category:"productivity",provider:"ios",role:"action",description:name,executionModes:["APP_INTENT","SHORTCUT"],risk:"low",requiresPro:false,publicApi:true,background:true,confirmation:false,permissions:[],parameters:{value:{type:"string",required:true}},inputs:["text"],outputs:[],fallback:"GUIDED_HANDOFF",availability:"ios"})),
  cap({id:"smart-home.scene.run",category:"smart-home",provider:"homekit",role:"action",description:"HomeKit-Szene",executionModes:["APP_INTENT","SHORTCUT"],risk:"medium",requiresPro:true,publicApi:true,background:true,confirmation:false,permissions:["home"],parameters:{scene:{type:"string",required:true}},inputs:[],outputs:[],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  cap({id:"vehicle.lock",category:"third-party",provider:"provider-router",role:"action",description:"Fahrzeug verriegeln",executionModes:["THIRD_PARTY_API"],risk:"high",requiresPro:true,publicApi:true,background:true,confirmation:true,permissions:[],parameters:{brand:{type:"string",required:false},vehicle:{type:"string",required:false}},inputs:["vehicle"],outputs:["provider-result"],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  cap({id:"vehicle.unlock",category:"third-party",provider:"provider-router",role:"action",description:"Fahrzeug entriegeln",executionModes:["THIRD_PARTY_API"],risk:"high",requiresPro:true,publicApi:true,background:true,confirmation:true,permissions:[],parameters:{brand:{type:"string",required:true},vehicle:{type:"string",required:false}},inputs:["vehicle"],outputs:["provider-result"],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  cap({id:"smart-home.cover.open",category:"smart-home",provider:"provider-router",role:"action",description:"Rollladen oder Beschattung öffnen",executionModes:["THIRD_PARTY_API"],risk:"medium",requiresPro:true,publicApi:true,background:true,confirmation:false,permissions:[],parameters:{provider:{type:"string",required:false},room:{type:"string",required:true},device:{type:"string",required:false}},inputs:["cover"],outputs:["provider-result"],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  cap({id:"smart-home.cover.close",category:"smart-home",provider:"provider-router",role:"action",description:"Rollladen oder Beschattung schließen",executionModes:["THIRD_PARTY_API"],risk:"medium",requiresPro:true,publicApi:true,background:true,confirmation:false,permissions:[],parameters:{provider:{type:"string",required:false},room:{type:"string",required:true},device:{type:"string",required:false}},inputs:["cover"],outputs:["provider-result"],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  cap({id:"smart-home.light.set",category:"smart-home",provider:"provider-router",role:"action",description:"Licht setzen",executionModes:["THIRD_PARTY_API"],risk:"low",requiresPro:true,publicApi:true,background:true,confirmation:false,permissions:[],parameters:{provider:{type:"string",required:false},room:{type:"string",required:true},value:{type:"string",required:true}},inputs:["light"],outputs:["provider-result"],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  cap({id:"smart-home.climate.set",category:"smart-home",provider:"provider-router",role:"action",description:"Temperatur oder Klima setzen",executionModes:["THIRD_PARTY_API"],risk:"medium",requiresPro:true,publicApi:true,background:true,confirmation:false,permissions:[],parameters:{provider:{type:"string",required:false},room:{type:"string",required:true},value:{type:"string",required:true}},inputs:["climate"],outputs:["provider-result"],fallback:"GUIDED_HANDOFF",availability:"ios"}),
  cap({id:"tesla.rear-trunk.close",category:"third-party",provider:"tesla",role:"action",description:"Offene Heckklappe schließen",executionModes:["THIRD_PARTY_API"],risk:"high",requiresPro:true,publicApi:true,background:true,confirmation:true,permissions:[],integration:"tesla",parameters:{expectedState:{type:"string",required:true,values:["open"]}},inputs:["vehicle-state"],outputs:["provider-result"],fallback:"GUIDED_HANDOFF",availability:"ios"})
] as const;

export const capabilityV2 = (id:string) => CAPABILITY_CATALOG_V2.find((item)=>item.id===id);
export function selectCapabilityCandidates(goal:string) { const q=goal.toLowerCase(); return CAPABILITY_CATALOG_V2.filter((c)=>c.role==="trigger" || c.description.split(/[.-]/).some((term)=>term.length>3&&q.includes(term)) || (q.includes("spotify")&&c.id.includes("spotify")) || (q.includes("helligkeit")&&c.id.includes("brightness")) || (q.includes("fokus")&&c.id.includes("focus")) || (q.includes("navigation")&&c.category==="navigation") || (q.includes("stromspar")&&c.id.includes("low-power")) || (q.includes("tesla")&&c.provider==="tesla")); }
