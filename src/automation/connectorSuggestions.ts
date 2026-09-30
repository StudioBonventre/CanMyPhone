import { connectorPlanForDefinition } from "./connectorPlanning";
import type { ShortcutDefinition } from "./shortcutCompiler";

export type ConnectorFallbackSuggestion = {
  title: string;
  message: string;
};

export function connectorFallbackSuggestion(definition: ShortcutDefinition): ConnectorFallbackSuggestion | null {
  const plan=connectorPlanForDefinition(definition);
  const unsupported=plan.requirements.find((item)=>item.binding.status==="UNSUPPORTED"||item.binding.status==="DISCOVERY_REQUIRED");
  if(!unsupported || !(unsupported.binding.status==="UNSUPPORTED"||unsupported.binding.status==="DISCOVERY_REQUIRED"))return null;
  if(unsupported.binding.status==="DISCOVERY_REQUIRED"&&!unsupported.binding.fallbackCandidates.length)return {title:"Neue Verbindung wird geprüft",message:"Die gewünschte Integration benötigt eine Prüfung ihrer dokumentierten Schnittstellen und Freigaben."};
  if(!unsupported.binding.fallbackCandidates.length)return null;
  const alternatives=unsupported.binding.fallbackCandidates.map((item)=>item.displayName);
  return {
    title:"Alternativen prüfen",
    message:`Für den genannten Hersteller gibt es noch keinen direkten Connector. CanMyPhone kann prüfen, ob das Gerät über ${alternatives.join(", ")} erreichbar ist.`
  };
}
