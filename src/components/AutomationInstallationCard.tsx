import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { hasValidSafetyApproval, type StoredAutomation } from "../automation/materialization";
import { compileAutomationRuntime } from "../automation/engine";
import { connectorPlanForDefinition } from "../automation/connectorPlanning";
import { launcherPlanForDefinition } from "../automation/appLauncher";
import { liquidIce } from "../theme/liquidIce";
import { ContentSurface } from "./ContentSurface";
import { LiquidButton } from "./LiquidButton";

export function AutomationInstallationCard({
  automation,
  onHandoff,
  onConfirm,
  onCancel,
  onApprove,
  onLaunchWithCanMyPhone,
  onRequestLocationPermission,
  onSaveNamedLocation,
  locationAlways = false,
  namedLocationNames = [],
  connectedProviderIds = []
}:{
  automation:StoredAutomation;
  onHandoff:()=>void;
  onConfirm:()=>void;
  onCancel:()=>void;
  onApprove:()=>void;
  onLaunchWithCanMyPhone?:()=>void;
  onRequestLocationPermission?:()=>void;
  onSaveNamedLocation?:(name:string)=>void;
  locationAlways?:boolean;
  namedLocationNames?:string[];
  connectedProviderIds?:string[];
}) {
  const setup=automation.personalSetup;
  const direct=!setup;
  const runtime=compileAutomationRuntime(automation.definition);
  const connectorPlan=connectorPlanForDefinition(automation.definition,new Set(connectedProviderIds));
  const launcherPlan=launcherPlanForDefinition(automation.definition);
  const locationTrigger=["trigger.location-enter","trigger.location-exit"].includes(automation.definition.trigger.capabilityId);
  const locationValue=typeof automation.definition.trigger.parameters.value==="string"?automation.definition.trigger.parameters.value:"";
  const locationConfigured=locationValue
    ?namedLocationNames.some((name)=>name.localeCompare(locationValue,undefined,{sensitivity:"accent"})===0)
    :false;
  const waitingForLocation=locationTrigger&&(!locationAlways||!locationConfigured);
  const waitingForConnector=automation.materializationState==="INTEGRATION_REQUIRED"||connectorPlan.requirements.length>0;
  const heading=automation.materializationState==="ACTIVE"
    ?"AKTIV"
    :waitingForConnector
      ?"VERBINDUNGEN NÖTIG"
      :waitingForLocation
        ?"STANDORT EINRICHTEN"
        :runtime.appleBridgeRequired
        ?"SYSTEM-TRIGGER NÖTIG"
        :"BEREIT";
  const status=automation.materializationState==="ACTIVE"
    ?"CanMyPhone überwacht diese Automation."
    :waitingForConnector
      ?"CanMyPhone hat die Logik verstanden. Vor der Ausführung müssen die benötigten Hersteller oder Smart-Home-Systeme verbunden werden."
      :waitingForLocation
        ?"CanMyPhone kann diesen Ortsauslöser selbst überwachen. Dafür fehlen nur noch deine Standortfreigabe oder der benannte Ort."
        :runtime.appleBridgePurpose==="TRIGGER_ONLY"
        ?"Die Logik liegt in CanMyPhone. iOS stellt diesen Trigger Drittanbieter-Apps derzeit nicht direkt bereit."
        :runtime.summary;

  return <ContentSurface emphasis="active" style={styles.card}>
    <Text style={styles.eyebrow}>{heading}</Text>
    <Text style={styles.title}>{automation.name}</Text>
    <Text style={styles.status}>{status}</Text>

    {launcherPlan.available
      ?<View style={styles.launcherBox}>
        <Text style={styles.launcherEyebrow}>OHNE KURZBEFEHLE</Text>
        <Text style={styles.launcherTitle}>{launcherPlan.target.displayName} über CanMyPhone öffnen</Text>
        <Text style={styles.launcherText}>CanMyPhone führt die gespeicherten Aktionen zuerst aus und öffnet danach {launcherPlan.target.displayName}. So ist für diesen Weg kein Apple-Trigger nötig.</Text>
        <LiquidButton label={`${launcherPlan.target.displayName} mit Automation öffnen`} onPress={()=>onLaunchWithCanMyPhone?.()}/>
      </View>
      :null}

    {runtime.appleBridgePurpose==="TRIGGER_ONLY"
      ?<Text style={styles.engineNote}>Kurzbefehle ist hier nur der letzte Trigger-Fallback — nicht die Automation selbst.</Text>
      :null}

    {connectorPlan.requirements.length
      ?<View style={styles.connectorList}>
        {connectorPlan.requirements.map((requirement,index)=>{
          const binding=requirement.binding;
          const provider="provider" in binding
            ?binding.provider.displayName
            :"candidates" in binding
              ?binding.candidates.map((item)=>item.displayName).join(" / ")
              :"noch kein passender Connector";
          const state=binding.status==="BOUND"
            ?"Verbunden"
            :binding.status==="CONNECTION_REQUIRED"
              ?"Verbindung erforderlich"
              :binding.status==="NOT_IMPLEMENTED"
                ?"Connector noch nicht implementiert"
                :binding.status==="AMBIGUOUS"
                  ?"Ausführungsweg auswählen"
                  :"Noch kein direkter Connector";
          return <View key={`${requirement.capabilityId}-${index}`} style={styles.connectorRow}>
            <Text style={styles.connectorName}>{provider}</Text>
            <Text style={styles.connectorState}>{state}</Text>
          </View>;
        })}
      </View>
      :null}

    {locationTrigger&&waitingForLocation
      ?<View style={styles.locationBox}>
        <Text style={styles.launcherEyebrow}>NATIVER ORTSAUSLÖSER</Text>
        {!locationAlways
          ?<LiquidButton label="Standort für Automationen erlauben" onPress={()=>onRequestLocationPermission?.()}/>
          :<Text style={styles.locationReady}>Standortzugriff „Immer“ ist aktiv.</Text>}
        {!locationConfigured&&locationValue
          ?<LiquidButton variant="glass" label={`„${locationValue}“ hier speichern`} onPress={()=>onSaveNamedLocation?.(locationValue)}/>
          :locationConfigured
            ?<Text style={styles.locationReady}>Ort „{locationValue}“ ist gespeichert.</Text>
            :null}
      </View>
      :null}

    {automation.requiredSetup.length
      ?<Text style={styles.requirements}>Benötigt: {automation.requiredSetup.join(" · ")}</Text>
      :null}

    {automation.safetyApproval.required&&!hasValidSafetyApproval(automation)
      ?<>
        <Text style={styles.warning}>Sensible Aktion: Prüfe Trigger, Bedingungen und Aktion genau. Deine Freigabe gilt nur für diese konkrete Version.</Text>
        <LiquidButton label="Diese Automation ausdrücklich freigeben" onPress={onApprove}/>
      </>
      :<>
        {setup
          ?<View style={styles.steps}>{(runtime.appleBridgePurpose==="TRIGGER_ONLY"
            ?[
              "Nur wenn du den originalen App-/System-Trigger verwenden willst: „Apple-Trigger verbinden“ öffnen.",
              "In Kurzbefehle die CanMyPhone-Aktion „Automation ausführen“ verwenden.",
              setup.setupSteps[1] ?? "Den gewünschten Apple-Trigger auswählen.",
              "Mit „Fertig“ sichern."
            ]
            :setup.handoffMode==="APPLE_INTELLIGENCE"
              ?[
                "CanMyPhone hat die Automation vorbereitet.",
                "Füge die Beschreibung in Kurzbefehle ein.",
                "Prüfe Apples Vorschlag und bestätige ihn."
              ]
              :setup.setupSteps
          ).map((step,index)=><View key={`${index}-${step}`} style={styles.step}>
            <Text style={styles.number}>{index+1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>)}</View>
          :null}

        {setup?.setupState==="AWAITING_CONFIRMATION"
          ?<>
            <Text style={styles.question}>Hast du den System-Trigger fertig verbunden?</Text>
            <LiquidButton label="Ja, fertig" onPress={onConfirm}/>
            <Pressable onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Noch nicht</Text></Pressable>
          </>
          :waitingForConnector||waitingForLocation
            ?null
            :launcherPlan.available&&runtime.appleBridgePurpose==="TRIGGER_ONLY"
              ?<Pressable onPress={onHandoff} style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Original-App-Icon verwenden → Apple-Trigger verbinden</Text></Pressable>
              :<LiquidButton
                label={direct?"Jetzt aktivieren":runtime.appleBridgePurpose==="TRIGGER_ONLY"?"Apple-Trigger verbinden":setup?.setupState==="HANDED_OFF"?"Kurzbefehle erneut öffnen":"Kurzbefehle öffnen"}
                onPress={direct?onConfirm:onHandoff}
              />}
      </>}
  </ContentSurface>;
}

const styles=StyleSheet.create({
  card:{marginTop:18,padding:20},
  eyebrow:{...liquidIce.type.eyebrow,color:liquidIce.color.automation},
  title:{marginTop:8,fontSize:20,lineHeight:25,fontWeight:"800",color:liquidIce.color.textPrimary},
  status:{marginTop:7,fontSize:13,lineHeight:19,color:liquidIce.color.textSecondary},
  engineNote:{marginTop:7,fontSize:12,lineHeight:17,fontWeight:"700",color:liquidIce.color.accent},
  launcherBox:{marginTop:16,padding:14,borderRadius:16,backgroundColor:"rgba(8,123,255,0.06)",borderWidth:StyleSheet.hairlineWidth,borderColor:"rgba(8,123,255,0.18)",gap:8},
  launcherEyebrow:{fontSize:10,fontWeight:"900",letterSpacing:1.2,color:liquidIce.color.accent},
  launcherTitle:{fontSize:15,fontWeight:"800",color:liquidIce.color.textPrimary},
  launcherText:{fontSize:12,lineHeight:18,color:liquidIce.color.textSecondary},
  secondaryAction:{alignItems:"center",paddingTop:14,paddingHorizontal:8},
  secondaryActionText:{fontSize:12,lineHeight:18,fontWeight:"700",textAlign:"center",color:liquidIce.color.textSecondary},
  locationBox:{marginTop:14,padding:14,borderRadius:16,backgroundColor:"rgba(255,255,255,0.62)",borderWidth:StyleSheet.hairlineWidth,borderColor:"rgba(79,94,110,0.14)",gap:10},
  locationReady:{fontSize:12,fontWeight:"700",color:liquidIce.color.textSecondary},
  connectorList:{marginTop:14,gap:8},
  connectorRow:{padding:12,borderRadius:14,backgroundColor:"rgba(255,255,255,0.58)",borderWidth:StyleSheet.hairlineWidth,borderColor:"rgba(79,94,110,0.14)"},
  connectorName:{fontSize:13,fontWeight:"700",color:liquidIce.color.textPrimary},
  connectorState:{marginTop:3,fontSize:11,color:liquidIce.color.textSecondary},
  requirements:{marginTop:10,fontSize:12,lineHeight:17,fontWeight:"600",color:liquidIce.color.textTertiary},
  warning:{marginVertical:16,padding:14,borderRadius:16,backgroundColor:"rgba(196,71,71,0.09)",fontSize:13,lineHeight:19,fontWeight:"600",color:"#923A3A"},
  steps:{marginVertical:18,gap:12},
  step:{flexDirection:"row",gap:12,alignItems:"flex-start"},
  number:{width:26,height:26,borderRadius:13,textAlign:"center",paddingTop:4,backgroundColor:"rgba(8,123,255,0.10)",color:liquidIce.color.accent,fontWeight:"800"},
  stepText:{flex:1,fontSize:13,lineHeight:19,color:liquidIce.color.textPrimary},
  question:{marginVertical:16,fontSize:16,lineHeight:22,fontWeight:"700",color:liquidIce.color.textPrimary},
  cancel:{alignItems:"center",paddingTop:15},
  cancelText:{fontSize:14,fontWeight:"600",color:liquidIce.color.textSecondary}
});
