import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { hasValidSafetyApproval, type StoredAutomation } from "../automation/materialization";
import { liquidIce } from "../theme/liquidIce";
import { ContentSurface } from "./ContentSurface";
import { LiquidButton } from "./LiquidButton";

export function AutomationInstallationCard({ automation, onHandoff, onConfirm, onCancel, onApprove }:{ automation:StoredAutomation; onHandoff:()=>void; onConfirm:()=>void; onCancel:()=>void; onApprove:()=>void }) {
  const setup=automation.personalSetup;
  const direct=!setup;
  return <ContentSurface emphasis="active" style={styles.card}>
    <Text style={styles.eyebrow}>{direct?"BEREIT":"FAST FERTIG"}</Text>
    <Text style={styles.title}>{automation.name}</Text>
    <Text style={styles.status}>{automation.materializationState === "ACTIVE" ? "AKTIV · Wartet auf Trigger" : direct ? "CanMyPhone kann diese Aktion direkt ausführen." : "Ein Apple-Schritt fehlt noch."}</Text>
    {automation.requiredSetup.length ? <Text style={styles.requirements}>Benötigt: {automation.requiredSetup.join(" · ")}</Text> : null}
    {automation.safetyApproval.required&&!hasValidSafetyApproval(automation)?<><Text style={styles.warning}>Sensible Aktion: Prüfe Trigger, Bedingungen und Aktion genau. Deine Freigabe gilt nur für diese konkrete Version.</Text><LiquidButton label="Diese Automation ausdrücklich freigeben" onPress={onApprove}/></>:<>{setup ? <View style={styles.steps}>{setup.setupSteps.map((step,index)=><View key={`${index}-${step}`} style={styles.step}><Text style={styles.number}>{index+1}</Text><Text style={styles.stepText}>{step}</Text></View>)}</View> : null}
    {setup?.setupState === "AWAITING_CONFIRMATION" ? <>
      <Text style={styles.question}>Hast du die Automation in Kurzbefehle fertiggestellt?</Text>
      <LiquidButton label="Ja, fertig" onPress={onConfirm}/>
      <Pressable onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Noch nicht</Text></Pressable>
    </> : <LiquidButton label={direct?"Jetzt aktivieren":setup?.setupState === "HANDED_OFF" ? "Kurzbefehle erneut öffnen" : "Kurzbefehle öffnen"} onPress={direct?onConfirm:onHandoff}/>}</>}
  </ContentSurface>;
}

const styles=StyleSheet.create({card:{marginTop:18,padding:20},eyebrow:{...liquidIce.type.eyebrow,color:liquidIce.color.automation},title:{marginTop:8,fontSize:20,lineHeight:25,fontWeight:"800",color:liquidIce.color.textPrimary},status:{marginTop:7,fontSize:13,lineHeight:19,color:liquidIce.color.textSecondary},requirements:{marginTop:10,fontSize:12,lineHeight:17,fontWeight:"600",color:liquidIce.color.textTertiary},warning:{marginVertical:16,padding:14,borderRadius:16,backgroundColor:"rgba(196,71,71,0.09)",fontSize:13,lineHeight:19,fontWeight:"600",color:"#923A3A"},steps:{marginVertical:18,gap:12},step:{flexDirection:"row",gap:12,alignItems:"flex-start"},number:{width:26,height:26,borderRadius:13,textAlign:"center",paddingTop:4,backgroundColor:"rgba(8,123,255,0.10)",color:liquidIce.color.accent,fontWeight:"800"},stepText:{flex:1,fontSize:13,lineHeight:19,color:liquidIce.color.textPrimary},question:{marginVertical:16,fontSize:16,lineHeight:22,fontWeight:"700",color:liquidIce.color.textPrimary},cancel:{alignItems:"center",paddingTop:15},cancelText:{fontSize:14,fontWeight:"600",color:liquidIce.color.textSecondary}});
