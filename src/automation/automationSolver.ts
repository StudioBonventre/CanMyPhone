import { compileAutomationRuntime } from "./engine";
import { launcherPlanForDefinition } from "./appLauncher";
import { connectorPlanForDefinition } from "./connectorPlanning";
import type { ShortcutDefinition } from "./shortcutCompiler";

export type AutomationRouteKind =
  | "CANMYPHONE_NATIVE"
  | "CANMYPHONE_LAUNCHER"
  | "CONNECTED_PROVIDER"
  | "APPLE_SYSTEM_BRIDGE"
  | "SETUP_REQUIRED"
  | "UNAVAILABLE";

export type AutomationRouteCandidate={
  kind:AutomationRouteKind;
  rank:number;
  automatic:boolean;
  exact:boolean;
  summary:string;
};

export function solveAutomationRoutes(
  definition:ShortcutDefinition,
  connectedProviderIds:ReadonlySet<string>=new Set()
):AutomationRouteCandidate[]{
  const runtime=compileAutomationRuntime(definition);
  const launcher=launcherPlanForDefinition(definition);
  const connectors=connectorPlanForDefinition(definition,connectedProviderIds);
  const routes:AutomationRouteCandidate[]=[];

  if(runtime.installationHost==="CANMYPHONE_NATIVE"&&!runtime.providerRequired&&runtime.canmyphoneOwnsAllActions){
    routes.push({kind:"CANMYPHONE_NATIVE",rank:100,automatic:true,exact:true,summary:"CanMyPhone kann Trigger und Aktionen selbst ausführen."});
  }

  if(launcher.available){
    routes.push({kind:"CANMYPHONE_LAUNCHER",rank:20,automatic:false,exact:false,summary:`Manuell über CanMyPhone gestartet: Aktionen ausführen und danach ${launcher.target.displayName} öffnen.`});
  }

  if(runtime.installationHost!=="UNSUPPORTED"&&connectors.requirements.length&&connectors.ready){
    routes.push({kind:"CONNECTED_PROVIDER",rank:85,automatic:true,exact:true,summary:"Alle benötigten Hersteller-Connectoren sind verbunden."});
  }else if(connectors.discoveryRequired){
    routes.push({kind:"SETUP_REQUIRED",rank:45,automatic:false,exact:false,summary:"Neue Verbindung wird geprüft. Der gewünschte Integrationsweg ist noch nicht freigegeben."});
  }else if(runtime.installationHost!=="UNSUPPORTED"&&connectors.requirements.length){
    routes.push({kind:"SETUP_REQUIRED",rank:45,automatic:false,exact:true,summary:"Die Automation ist technisch auflösbar, benötigt aber noch eine Herstellerverbindung."});
  }

  if(runtime.installationHost==="APPLE_PERSONAL_AUTOMATION"){
    routes.push({kind:"APPLE_SYSTEM_BRIDGE",rank:30,automatic:false,exact:true,summary:"Mindestens ein Trigger oder eine Aktion gehört weiterhin Apples System-Orchestrierung."});
  }

  if(!routes.length){
    routes.push({kind:"UNAVAILABLE",rank:0,automatic:false,exact:false,summary:"Für mindestens einen gewünschten Effekt gibt es noch keinen verifizierten öffentlichen Ausführungsweg."});
  }

  return routes.sort((a,b)=>b.rank-a.rank);
}
