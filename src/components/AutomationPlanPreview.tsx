import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AutomationPlan } from "../automation/types";
import { liquidIce } from "../theme/liquidIce";
import { ContentSurface } from "./ContentSurface";
import { GlassSurface } from "./GlassSurface";
import { LiquidButton } from "./LiquidButton";

type Props = { plan: AutomationPlan; pro: boolean; onConnect: () => void };
const execution = { "on-device": "Auf deinem iPhone", server: "Sicherer CanMyPhone-Server", "shortcut-handoff": "Apple Kurzbefehle", guided: "Mit deiner Bestätigung" } as const;
const risk = { low: "Niedrig", medium: "Mittel", high: "Hoch · Bestätigung nötig" } as const;
const auth = { "location-always": "Standort – Immer", oauth: "Tesla verbinden", "virtual-key": "Tesla Virtual Key", "explicit-confirmation": "Automation bestätigen" } as const;

function Section({ title, items }: { title: string; items: string[] }) {
  return <View style={styles.section}><Text style={styles.eyebrow}>{title}</Text>{items.map((item, index) => <ContentSurface key={`${title}-${index}`} style={styles.row}><Text style={styles.number}>{index + 1}</Text><Text style={styles.rowText}>{item}</Text></ContentSurface>)}</View>;
}

export function AutomationPlanPreview({ plan, pro, onConnect }: Props) {
  return <GlassSurface variant="floating" style={styles.card}>
    <View style={styles.header}><View style={styles.headerText}><Text style={styles.badge}>GEPRÜFTER AUTOMATIONSPLAN</Text><Text style={styles.title}>{plan.title}</Text></View><Text style={styles.risk}>{risk[plan.riskLevel]}</Text></View>
    <Text style={styles.summary}>{plan.explanation[0]}</Text>
    <View style={styles.metaRow}><ContentSurface style={styles.meta}><Text style={styles.metaLabel}>AUSFÜHRUNG</Text><Text style={styles.metaValue}>{execution[plan.executionMode]}</Text></ContentSurface><ContentSurface style={styles.meta}><Text style={styles.metaLabel}>PRO</Text><Text style={styles.metaValue}>{plan.requiresPro ? (pro ? "Enthalten" : "Erforderlich") : "Nicht nötig"}</Text></ContentSurface></View>
    <Section title="WENN" items={["Du den Bereich um deinen geparkten Tesla verlässt"]} />
    <Section title="CANMYPHONE PRÜFT" items={["Tesla ist verbunden und erreichbar", "Der hintere Kofferraum ist eindeutig offen", "Dein Pro-Zugang ist aktiv"]} />
    <Section title="DANN" items={["Heckkofferraum über die offizielle Tesla Fleet API schließen", "Erfolg erst nach bestätigter Provider-Antwort anzeigen"]} />
    <View style={styles.section}><Text style={styles.eyebrow}>EINMALIG NÖTIG</Text>{plan.authorizations.map((item) => <ContentSurface key={item.id} style={styles.authorization}><View style={styles.authorizationText}><Text style={styles.authorizationTitle}>{auth[item.kind]}</Text><Text style={styles.authorizationReason}>{item.reason}</Text></View><Text style={styles.once}>EINMAL</Text></ContentSurface>)}</View>
    <View style={styles.section}><Text style={styles.eyebrow}>WENN ETWAS NICHT KLAPPT</Text>{plan.fallbacks.map((item) => <Text key={item.id} style={styles.fallback}>• {item.message}</Text>)}</View>
    <ContentSurface emphasis="active" style={styles.truth}><Text style={styles.truthTitle}>Noch nicht erstellt</Text><Text style={styles.truthText}>CanMyPhone richtet zuerst die erforderlichen Verbindungen und Freigaben ein. Bis Tesla und iOS bestätigt sind, wird nichts als aktiv angezeigt.</Text></ContentSurface>
    <LiquidButton style={styles.button} label="Verbindungen einrichten" onPress={onConnect} />
  </GlassSurface>;
}

const styles = StyleSheet.create({
  card:{padding:20,gap:16},header:{flexDirection:"row",gap:12,alignItems:"flex-start"},headerText:{flex:1},badge:{...liquidIce.type.eyebrow,color:liquidIce.color.accent,marginBottom:8},title:{...liquidIce.type.titleMedium,color:liquidIce.color.textPrimary},risk:{...liquidIce.type.caption,color:liquidIce.color.confirmation,backgroundColor:"rgba(104,114,166,0.10)",paddingHorizontal:10,paddingVertical:6,borderRadius:99,overflow:"hidden"},summary:{...liquidIce.type.bodyMedium,color:liquidIce.color.textSecondary},metaRow:{flexDirection:"row",gap:10},meta:{flex:1,padding:12},metaLabel:{...liquidIce.type.eyebrow,color:liquidIce.color.textTertiary},metaValue:{...liquidIce.type.labelLarge,color:liquidIce.color.textPrimary,marginTop:4},section:{gap:8},eyebrow:{...liquidIce.type.eyebrow,color:liquidIce.color.textTertiary},row:{padding:12,flexDirection:"row",alignItems:"center",gap:10},number:{...liquidIce.type.labelLarge,color:liquidIce.color.accent,width:18},rowText:{...liquidIce.type.bodyMedium,color:liquidIce.color.textPrimary,flex:1},authorization:{padding:12,flexDirection:"row",alignItems:"center",gap:10},authorizationText:{flex:1},authorizationTitle:{...liquidIce.type.labelLarge,color:liquidIce.color.textPrimary},authorizationReason:{...liquidIce.type.caption,color:liquidIce.color.textSecondary,marginTop:2},once:{...liquidIce.type.eyebrow,color:liquidIce.color.automation},fallback:{...liquidIce.type.bodyMedium,color:liquidIce.color.textSecondary},truth:{padding:14},truthTitle:{...liquidIce.type.labelLarge,color:liquidIce.color.confirmation},truthText:{...liquidIce.type.bodyMedium,color:liquidIce.color.textSecondary,marginTop:4},button:{marginTop:4}
});
