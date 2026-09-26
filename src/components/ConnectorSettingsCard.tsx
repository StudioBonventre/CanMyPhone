import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { PROVIDER_REGISTRY } from "../automation/providerRegistry";
import { connectorSetupPlan } from "../automation/connectorSetup";
import { connectionFor, type ConnectorConnectionProfile } from "../automation/connectorConnectionState";
import { liquidIce } from "../theme/liquidIce";
import { ContentSurface } from "./ContentSurface";

function transportLabel(value:string){
  switch(value){
    case "cloud-api":return "Cloud API";
    case "local-api":return "Lokales Netzwerk";
    case "homekit":return "Apple Home";
    case "matter":return "Matter";
    default:return "Native";
  }
}

export type ConnectorConnectInput = { hcuSuffix?: string; activationKey?: string };

export function ConnectorSettingsCard({profile,onConnect}:{profile:ConnectorConnectionProfile;onConnect?:(providerId:string,input?:ConnectorConnectInput)=>void}){
  const [expanded,setExpanded]=useState<string|null>(null);
  const [hcuSuffix,setHcuSuffix]=useState("");
  const [activationKey,setActivationKey]=useState("");
  return <ContentSurface style={styles.card}>
    <Text style={styles.eyebrow}>VERBINDUNGEN</Text>
    <Text style={styles.title}>Connector-Plattform</Text>
    <Text style={styles.copy}>CanMyPhone verbindet Hersteller und Smart-Home-Systeme über verifizierte Schnittstellen. Eine Verbindung gilt erst dann als aktiv, wenn sie wirklich autorisiert wurde.</Text>
    <View style={styles.list}>
      {PROVIDER_REGISTRY.map((provider)=>{
        const connection=connectionFor(profile,provider.id);
        const plan=connectorSetupPlan(provider.id);
        const state=connection?.status==="CONNECTED"
          ?"Verbunden"
          :connection?.status==="CONNECTING"
            ?"Verbindung läuft"
            :connection?.status==="ERROR"
              ?"Zugriff fehlt"
              :provider.implementation==="PLANNED"
                ?"Geplant"
                :"Noch nicht verbunden";
        const open=expanded===provider.id;
        return <View key={provider.id} style={styles.wrapper}>
          <Pressable onPress={()=>setExpanded(open?null:provider.id)} style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.name}>{provider.displayName}</Text>
              <Text style={styles.meta}>{transportLabel(provider.transport)} · {provider.operations.length} Aktionen</Text>
            </View>
            <View style={[styles.badge,connection?.status==="CONNECTED"&&styles.badgeActive]}>
              <Text style={[styles.badgeText,connection?.status==="CONNECTED"&&styles.badgeTextActive]}>{state}</Text>
            </View>
          </Pressable>
          {open&&plan?<View style={styles.details}>
            {plan.steps.map((step,index)=><View key={step.id} style={styles.step}>
              <Text style={styles.stepIndex}>{index+1}</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDetail}>{step.detail}</Text>
              </View>
            </View>)}
            <Text style={styles.footnote}>{plan.executableToday?"Connector ausführbar":"Connector-Plattform vorbereitet · Verbindung noch nicht freigeschaltet"}</Text>
            {provider.id==="homematic-ip"&&plan.executableToday&&connection?.status!=="CONNECTED"?<View style={styles.pairingFields}>
              <TextInput
                value={hcuSuffix}
                onChangeText={(value)=>setHcuSuffix(value.replace(/[^A-Za-z0-9]/g,"").slice(0,4).toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="Letzte 4 Stellen der HCU-SGTIN"
                placeholderTextColor={liquidIce.color.textTertiary}
                style={styles.input}
                accessibilityLabel="Letzte vier Stellen der Homematic HCU SGTIN"
              />
              <TextInput
                value={activationKey}
                onChangeText={setActivationKey}
                autoCapitalize="characters"
                autoCorrect={false}
                secureTextEntry
                placeholder="Einmaliger Aktivierungsschlüssel"
                placeholderTextColor={liquidIce.color.textTertiary}
                style={styles.input}
                accessibilityLabel="Homematic HCU Aktivierungsschlüssel"
              />
              <Text style={styles.localHint}>Die Kopplung läuft nur im lokalen Netzwerk. Der HCU-Auth-Token wird im iOS-Keychain gespeichert.</Text>
            </View>:null}
            {plan.executableToday&&connection?.status!=="CONNECTED"
              ?<Pressable
                  disabled={connection?.status==="CONNECTING"||(provider.id==="homematic-ip"&&(hcuSuffix.length!==4||!activationKey.trim()))}
                  onPress={()=>onConnect?.(provider.id,provider.id==="homematic-ip"?{hcuSuffix,activationKey}:undefined)}
                  style={[styles.connectButton,(connection?.status==="CONNECTING"||(provider.id==="homematic-ip"&&(hcuSuffix.length!==4||!activationKey.trim())))&&styles.connectButtonDisabled]}
                ><Text style={styles.connectButtonText}>{connection?.status==="CONNECTING"?"Verbindung läuft …":"Verbinden"}</Text></Pressable>
              :null}
          </View>:null}
        </View>;
      })}
    </View>
  </ContentSurface>;
}

const styles=StyleSheet.create({
  card:{marginBottom:14,padding:20},
  eyebrow:{...liquidIce.type.eyebrow,color:liquidIce.color.automation},
  title:{marginTop:8,fontSize:20,fontWeight:"800",color:liquidIce.color.textPrimary},
  copy:{marginTop:7,fontSize:13,lineHeight:19,color:liquidIce.color.textSecondary},
  list:{marginTop:14},
  wrapper:{borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"rgba(79,94,110,0.12)"},
  row:{paddingVertical:13,flexDirection:"row",alignItems:"center",gap:10},
  rowCopy:{flex:1},
  name:{fontSize:14,fontWeight:"700",color:liquidIce.color.textPrimary},
  meta:{marginTop:3,fontSize:11,color:liquidIce.color.textTertiary},
  badge:{paddingHorizontal:9,paddingVertical:6,borderRadius:999,backgroundColor:"rgba(79,94,110,0.08)"},
  badgeActive:{backgroundColor:"rgba(8,123,255,0.11)"},
  badgeText:{fontSize:10,fontWeight:"800",color:liquidIce.color.textTertiary},
  badgeTextActive:{color:liquidIce.color.accent},
  details:{paddingBottom:14,gap:10},
  step:{flexDirection:"row",gap:10},
  stepIndex:{width:22,height:22,borderRadius:11,textAlign:"center",paddingTop:2,backgroundColor:"rgba(8,123,255,0.10)",color:liquidIce.color.accent,fontWeight:"800",fontSize:12},
  stepCopy:{flex:1},
  stepTitle:{fontSize:12,fontWeight:"700",color:liquidIce.color.textPrimary},
  stepDetail:{marginTop:2,fontSize:11,lineHeight:16,color:liquidIce.color.textSecondary},
  footnote:{marginTop:2,fontSize:10,fontWeight:"700",color:liquidIce.color.textTertiary},
  pairingFields:{gap:8,marginTop:2},
  input:{minHeight:44,borderRadius:14,paddingHorizontal:13,paddingVertical:10,backgroundColor:"rgba(79,94,110,0.07)",fontSize:13,color:liquidIce.color.textPrimary},
  localHint:{fontSize:10,lineHeight:15,color:liquidIce.color.textTertiary},
  connectButton:{marginTop:4,alignSelf:"flex-start",paddingHorizontal:14,paddingVertical:9,borderRadius:999,backgroundColor:liquidIce.color.textPrimary},
  connectButtonDisabled:{opacity:0.38},
  connectButtonText:{fontSize:12,fontWeight:"800",color:"#FFFFFF"}
});
