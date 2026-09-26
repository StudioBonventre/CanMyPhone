export type PlatformLimitation = {
  id:string;
  topic:string;
  unavailable:string;
  alternatives:string[];
};

export const IOS_PLATFORM_LIMITATIONS:readonly PlatformLimitation[]=[
  {
    id:"other-app-control",
    topic:"Andere Apps direkt steuern",
    unavailable:"Eine normale iOS-App kann andere installierte Apps nicht allgemein programmgesteuert beenden oder aus dem App-Umschalter entfernen.",
    alternatives:["gezielte Provider- oder App-API verwenden","CanMyPhone-Launcher verwenden","Apple-System-Orchestrierung nur als Fallback verwenden"]
  },
  {
    id:"foreign-app-launch-observation",
    topic:"Start einer fremden App erkennen",
    unavailable:"Eine Drittanbieter-App erhält keinen allgemeinen öffentlichen Callback für den Start beliebiger anderer Apps über deren Original-Icon.",
    alternatives:["CanMyPhone-Launcher oder Widget verwenden","dokumentierten Provider-/System-Trigger verwenden","Apple Personal Automation als Fallback"]
  },
  {
    id:"cross-app-media",
    topic:"Andere Medien-Apps steuern",
    unavailable:"Die öffentliche MediaPlayer-Schnittstelle ist keine allgemeine API zum Stoppen beliebiger anderer Apps.",
    alternatives:["App-spezifische APIs oder App Intents","verbundene Medien-Provider","Apple-System-Orchestrierung"]
  },
  {
    id:"system-settings",
    topic:"Beliebige iOS-Systemeinstellungen ändern",
    unavailable:"Viele Systemeinstellungen besitzen keine öffentliche Schreib-API für Drittanbieter-Apps.",
    alternatives:["öffentliche native API","App Intent oder Provider-API","Apple Shortcuts als letzter Fallback"]
  }
] as const;

export function compactPlatformLimitations():string{
  return IOS_PLATFORM_LIMITATIONS.map((item)=>
    `${item.id} | ${item.topic} | Grenze: ${item.unavailable} | Alternativen: ${item.alternatives.join("; ")}`
  ).join("\n");
}
