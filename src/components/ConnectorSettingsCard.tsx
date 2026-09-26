import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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

export function ConnectorSettingsCard({profile}:{profile:ConnectorConnectionProfile}){
  const [expanded,setExpanded]=useState<string|null>(null);
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
  footnote:{marginTop:2,fontSize:10,fontWeight:"700",color:liquidIce.color.textTertiary}
});
