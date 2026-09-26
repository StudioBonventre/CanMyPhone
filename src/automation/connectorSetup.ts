import { PROVIDER_REGISTRY, type ProviderDescriptor } from "./providerRegistry";

export type ConnectorSetupStep = {
  id: string;
  title: string;
  detail: string;
  userActionRequired: boolean;
};

export type ConnectorSetupPlan = {
  provider: ProviderDescriptor;
  steps: ConnectorSetupStep[];
  executableToday: boolean;
};

export function connectorSetupPlan(providerId: string): ConnectorSetupPlan | null {
  const provider=PROVIDER_REGISTRY.find((item)=>item.id===providerId);
  if(!provider)return null;

  const common:ConnectorSetupStep[]=[
    {id:"consent",title:"Verbindung erlauben",detail:"CanMyPhone verbindet den Anbieter nur nach deiner ausdrücklichen Freigabe.",userActionRequired:true}
  ];

  if(provider.id==="tesla"){
    return {
      provider,
      executableToday:true,
      steps:[
        ...common,
        {id:"oauth",title:"Tesla-Konto verbinden",detail:"OAuth-Freigabe für die benötigten Fahrzeugdaten und Befehle.",userActionRequired:true},
        {id:"virtual-key",title:"Fahrzeugbefehle autorisieren",detail:"Für unterstützte Fahrzeuge muss der offizielle Tesla-Virtual-Key/Command-Flow eingerichtet sein.",userActionRequired:true},
        {id:"verify",title:"Verbindung testen",detail:"CanMyPhone prüft den Fahrzeugstatus und sendet erst danach freigegebene Befehle.",userActionRequired:false}
      ]
    };
  }

  if(provider.id==="homematic-ip"){
    return {
      provider,
      executableToday:true,
      steps:[
        ...common,
        {id:"hcu",title:"Home Control Unit angeben",detail:"Gib die letzten vier Stellen der HCU-SGTIN ein. CanMyPhone verbindet sich danach ausschließlich lokal mit hcu1-XXXX.local.",userActionRequired:true},
        {id:"pair",title:"Lokale Verbindung autorisieren",detail:"Aktiviere in der HCU den Entwickler-/WebSocket-Zugang und gib den einmaligen Aktivierungsschlüssel ein. Der dauerhafte Auth-Token landet nur im iOS-Keychain.",userActionRequired:true},
        {id:"discover",title:"Räume und Geräte einlesen",detail:"CanMyPhone ordnet Rollläden, Lichter und Klima den vorhandenen Räumen zu.",userActionRequired:false}
      ]
    };
  }

  if(provider.id==="apple-home"){
    return {
      provider,
      executableToday:true,
      steps:[
        ...common,
        {id:"permission",title:"Apple-Home-Zugriff erlauben",detail:"CanMyPhone benötigt die HomeKit-Berechtigung, um vorhandene Räume und Geräte zu lesen und zu steuern.",userActionRequired:true},
        {id:"discover",title:"HomeKit-Geräte übernehmen",detail:"Vorhandene HomeKit-Räume und Zubehörteile werden als CanMyPhone-Ziele verfügbar.",userActionRequired:false}
      ]
    };
  }

  if(provider.id==="matter"){
    return {
      provider,
      executableToday:false,
      steps:[
        ...common,
        {id:"commission",title:"Matter-Gerät bereitstellen",detail:"Noch nicht eingebundene Matter-Geräte müssen sicher commissioniert werden.",userActionRequired:true},
        {id:"discover",title:"Matter-Funktionen erkennen",detail:"CanMyPhone liest die verfügbaren Cluster und bietet nur tatsächlich unterstützte Aktionen an.",userActionRequired:false}
      ]
    };
  }

  return {provider,executableToday:false,steps:common};
}
