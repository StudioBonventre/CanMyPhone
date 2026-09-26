export const semanticCapabilityIds = new Set([
  "trigger.manual",
  "trigger.time","trigger.weekday","trigger.alarm","trigger.sleep",
  "trigger.location-enter","trigger.location-exit",
  "trigger.carplay-connected","trigger.carplay-disconnected",
  "trigger.email-received","trigger.message-received","trigger.transaction",
  "trigger.wifi-connected","trigger.bluetooth-connected","trigger.bluetooth-disconnected",
  "trigger.apple-watch-workout","trigger.nfc","trigger.app-opened","trigger.app-closed",
  "trigger.airplane-mode-changed","trigger.focus-changed","trigger.low-power-mode-changed",
  "trigger.battery-level","trigger.charger-connected","trigger.charger-disconnected",
  "trigger.sound-recognition","trigger.app-intent",
  "system.brightness.set","system.volume.set","system.low-power.set","system.flashlight.set",
  "system.focus.set","system.app.open","system.url.open","system.clipboard.set",
  "media.play-pause","media.playlist.play","media.apple-music.play","media.spotify.open",
  "navigation.route.start",
  "communication.message.compose","communication.mail.compose","communication.call.start",
  "productivity.calendar.create","productivity.reminder.create","productivity.note.create",
  "productivity.file.save","productivity.text.transform",
  "smart-home.scene.run",
  "vehicle.lock","vehicle.unlock",
  "smart-home.cover.open","smart-home.cover.close","smart-home.light.set","smart-home.climate.set",
  "tesla.rear-trunk.close"
]);

export const semanticCapabilitySummary = [
  "Triggers: manual, time/weekday/alarm/sleep, location enter/exit, CarPlay, email/message/transaction, Wi-Fi, Bluetooth, Apple Watch workout, NFC, app opened/closed, airplane mode, focus, low-power mode, battery, charger, sound recognition.",
  "System actions: brightness, volume, low-power mode, flashlight, focus, app/url open, clipboard.",
  "Media/navigation/communication/productivity actions are available only through their allow-listed ids.",
  "Provider-neutral actions: vehicle.lock, vehicle.unlock, smart-home.cover.open/close, smart-home.light.set, smart-home.climate.set.",
  "Named providers currently known to routing: Tesla, Homematic IP, Apple Home, Matter, Home Assistant."
].join("\n");

export type SemanticEnvelope = {
  kind:"automation"|"clarification"|"not_automation";
  confidence:number;
  trigger:{capabilityId:string;parameters:Record<string,string|number|boolean>}|null;
  actions:Array<{capabilityId:string;parameters:Record<string,string|number|boolean>}>;
  clarificationQuestion:string|null;
  suggestion:{title:string;message:string;proposedGoal:string|null}|null;
};

function object(value:unknown):value is Record<string,unknown>{
  return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
}

function primitives(value:unknown):value is Record<string,string|number|boolean>{
  return object(value)&&Object.values(value).every((item)=>["string","number","boolean"].includes(typeof item));
}

function step(value:unknown):value is {capabilityId:string;parameters:Record<string,string|number|boolean>}{
  return object(value)&&
    Object.keys(value).every((key)=>["capabilityId","parameters"].includes(key))&&
    typeof value.capabilityId==="string"&&semanticCapabilityIds.has(value.capabilityId)&&
    primitives(value.parameters);
}

export function validateSemanticEnvelope(value:unknown):{ok:true;value:SemanticEnvelope}|{ok:false;code:string}{
  if(!object(value))return{ok:false,code:"invalid_model_output"};
  const allowed=["kind","confidence","trigger","actions","clarificationQuestion","suggestion"];
  if(!Object.keys(value).every((key)=>allowed.includes(key)))return{ok:false,code:"invalid_model_output"};
  if(!["automation","clarification","not_automation"].includes(String(value.kind)))return{ok:false,code:"invalid_kind"};
  if(typeof value.confidence!=="number"||value.confidence<0||value.confidence>1)return{ok:false,code:"invalid_confidence"};

  if(value.kind==="clarification"){
    if(typeof value.clarificationQuestion!=="string"||!value.clarificationQuestion.trim()||value.trigger!==null||!Array.isArray(value.actions)||value.actions.length!==0)return{ok:false,code:"invalid_clarification"};
    return{ok:true,value:value as unknown as SemanticEnvelope};
  }

  if(value.kind==="not_automation"){
    if(value.trigger!==null||!Array.isArray(value.actions)||value.actions.length!==0)return{ok:false,code:"invalid_not_automation"};
    return{ok:true,value:value as unknown as SemanticEnvelope};
  }

  if(!step(value.trigger)||!Array.isArray(value.actions)||value.actions.length===0||!value.actions.every(step))return{ok:false,code:"invalid_plan"};
  if(value.clarificationQuestion!==null)return{ok:false,code:"invalid_plan"};
  if(value.suggestion!==null){
    if(!object(value.suggestion)||!Object.keys(value.suggestion).every((key)=>["title","message","proposedGoal"].includes(key))||typeof value.suggestion.title!=="string"||typeof value.suggestion.message!=="string"||!(typeof value.suggestion.proposedGoal==="string"||value.suggestion.proposedGoal===null))return{ok:false,code:"invalid_suggestion"};
  }
  return{ok:true,value:value as unknown as SemanticEnvelope};
}

export function safeSemanticLogFields(requestId:string,result:"ok"|"clarification"|"error",code?:string){
  return{requestId,result,...(code?{code}:{})};
}
