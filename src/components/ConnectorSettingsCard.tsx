import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { PROVIDER_REGISTRY } from "../automation/providerRegistry";
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
  return <ContentSurface style={styles.card}>
    <Text style={styles.eyebrow}>VERBINDUNGEN</Text>
    <Text style={styles.title}>Connector-Plattform</Text>
    <Text style={styles.copy}>CanMyPhone verbindet Hersteller und Smart-Home-Systeme über verifizierte Schnittstellen. Keine Verbindung gilt als aktiv, bevor sie wirklich autorisiert wurde.</Text>
    <View style={styles.list}>
      {PROVIDER_REGISTRY.map((provider)=>{
        const connection=connectionFor(profile,provider.id);
        const state=connection?.status==="CONNECTED"
          ?"Verbunden"
          :provider.implementation==="PLANNED"
            ?"Geplant"
            :"Noch nicht verbunden";
        return <View key={provider.id} style={styles.row}>
          <View style={styles.rowCopy}>
            <Text style={styles.name}>{provider.displayName}</Text>
            <Text style={styles.meta}>{transportLabel(provider.transport)} · {provider.operations.length} Aktionen</Text>
          </View>
          <View style={[styles.badge,connection?.status==="CONNECTED"&&styles.badgeActive]}>
            <Text style={[styles.badgeText,connection?.status==="CONNECTED"&&styles.badgeTextActive]}>{state}</Text>
          </View>
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
  row:{paddingVertical:13,flexDirection:"row",alignItems:"center",gap:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:"rgba(79,94,110,0.12)"},
  rowCopy:{flex:1},
  name:{fontSize:14,fontWeight:"700",color:liquidIce.color.textPrimary},
  meta:{marginTop:3,fontSize:11,color:liquidIce.color.textTertiary},
  badge:{paddingHorizontal:9,paddingVertical:6,borderRadius:999,backgroundColor:"rgba(79,94,110,0.08)"},
  badgeActive:{backgroundColor:"rgba(8,123,255,0.11)"},
  badgeText:{fontSize:10,fontWeight:"800",color:liquidIce.color.textTertiary},
  badgeTextActive:{color:liquidIce.color.accent}
});
