import { actionExecutionMode } from "./materialization";
import type { ShortcutDefinition } from "./shortcutCompiler";

export type AppLaunchTarget = {
  id:string;
  displayName:string;
  aliases:string[];
  universalUrl:string;
};

export const APP_LAUNCH_TARGETS:readonly AppLaunchTarget[]=[
  {id:"tiktok",displayName:"TikTok",aliases:["tiktok"],universalUrl:"https://www.tiktok.com/"},
  {id:"instagram",displayName:"Instagram",aliases:["instagram","insta"],universalUrl:"https://www.instagram.com/"},
  {id:"threads",displayName:"Threads",aliases:["threads"],universalUrl:"https://www.threads.net/"},
  {id:"reddit",displayName:"Reddit",aliases:["reddit"],universalUrl:"https://www.reddit.com/"},
  {id:"youtube",displayName:"YouTube",aliases:["youtube"],universalUrl:"https://www.youtube.com/"},
  {id:"spotify",displayName:"Spotify",aliases:["spotify"],universalUrl:"https://open.spotify.com/"}
] as const;

function normalize(value:string){return value.trim().toLowerCase();}

export function appLaunchTargetForName(name:string):AppLaunchTarget|undefined{
  const q=normalize(name);
  return APP_LAUNCH_TARGETS.find((target)=>target.id===q||target.displayName.toLowerCase()===q||target.aliases.includes(q));
}

export type LauncherPlan =
  | {available:true;target:AppLaunchTarget;reason:"CANMYPHONE_OWNS_ACTIONS"}
  | {available:false;reason:"NOT_APP_OPEN_TRIGGER"|"APP_TARGET_UNKNOWN"|"ACTION_NOT_CANMYPHONE_EXECUTABLE"};

export function launcherPlanForDefinition(definition:ShortcutDefinition):LauncherPlan{
  if(definition.trigger.capabilityId!=="trigger.app-opened")return{available:false,reason:"NOT_APP_OPEN_TRIGGER"};
  const raw=definition.trigger.parameters.value;
  const appName=typeof raw==="string"?raw:"";
  const target=appLaunchTargetForName(appName);
  if(!target)return{available:false,reason:"APP_TARGET_UNKNOWN"};
  const owned=definition.actions.every((step)=>{
    const mode=actionExecutionMode(step);
    return mode==="EXECUTABLE_DIRECT"||mode==="EXECUTABLE_APP_INTENT";
  });
  if(!owned)return{available:false,reason:"ACTION_NOT_CANMYPHONE_EXECUTABLE"};
  return{available:true,target,reason:"CANMYPHONE_OWNS_ACTIONS"};
}
