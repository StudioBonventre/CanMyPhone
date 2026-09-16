import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GuideSession, Solution } from "../types";

type Props = {
  session: GuideSession;
  solution: Solution;
  returnedFromBackground?: boolean;
  liveActivityActive: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onLeaveForSettings: () => void;
  onFinish: () => void;
};

export function GuidedSetupCard({
  session,
  solution,
  returnedFromBackground,
  liveActivityActive,
  onPrevious,
  onNext,
  onLeaveForSettings,
  onFinish
}: Props) {
  const step = session.steps[session.currentStep] ?? "Continue";
  const isLast = session.currentStep >= session.steps.length - 1;
  const path = solution.settings?.path ?? [];

  return (
    <View style={styles.card}>
      {returnedFromBackground ? (
        <View style={styles.returnBanner}>
          <Text style={styles.returnTitle}>Da bist du wieder.</Text>
          <Text style={styles.returnText}>Ich habe deinen Platz behalten — weiter bei Schritt {session.currentStep + 1}.</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>DROP GUIDE</Text>
          <Text style={styles.title}>{session.title}</Text>
        </View>
        <Text style={styles.progress}>{session.currentStep + 1}/{session.steps.length}</Text>
      </View>

      {path.length ? (
        <View style={styles.pathWrap}>
          <Text style={styles.pathLabel}>In Einstellungen</Text>
          <Text style={styles.path}>{path.join("  ›  ")}</Text>
        </View>
      ) : null}

      <View style={styles.stepBox}>
        <Text style={styles.stepNumber}>SCHRITT {session.currentStep + 1}</Text>
        <Text style={styles.step}>{step}</Text>
      </View>

      <View style={styles.systemRow}>
        <Text style={styles.systemDot}>{liveActivityActive ? "●" : "○"}</Text>
        <Text style={styles.systemText}>
          {liveActivityActive
            ? "Dynamic Island / Live Activity begleitet dich außerhalb der App."
            : "Die Anleitung bleibt gespeichert. Mit dem iOS-Dev-Build erscheint sie zusätzlich als Live Activity."}
        </Text>
      </View>

      <Pressable style={styles.settingsButton} onPress={onLeaveForSettings}>
        <Text style={styles.settingsButtonText}>Ich wechsle jetzt zu Einstellungen</Text>
      </Pressable>

      {solution.settings?.note ? <Text style={styles.note}>{solution.settings.note}</Text> : null}

      <View style={styles.actions}>
        <Pressable disabled={session.currentStep === 0} onPress={onPrevious} style={[styles.secondary, session.currentStep === 0 && styles.disabled]}>
          <Text style={styles.secondaryText}>Zurück</Text>
        </Pressable>
        {isLast ? (
          <Pressable onPress={onFinish} style={styles.primary}><Text style={styles.primaryText}>Fertig</Text></Pressable>
        ) : (
          <Pressable onPress={onNext} style={styles.primary}><Text style={styles.primaryText}>Nächster Schritt</Text></Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 18, borderRadius: 28, padding: 18, backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: "#DDE5F0" },
  returnBanner: { padding: 13, borderRadius: 17, backgroundColor: "#EAF7FF", marginBottom: 15 },
  returnTitle: { fontSize: 14, fontWeight: "900", color: "#174A6A" },
  returnText: { fontSize: 13, lineHeight: 18, color: "#41667C", marginTop: 3 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 1.4, color: "#6388B8", marginBottom: 4 },
  title: { fontSize: 20, lineHeight: 25, fontWeight: "900", color: "#16212E" },
  progress: { fontSize: 13, fontWeight: "900", color: "#5B6D7E", backgroundColor: "#EEF3F8", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  pathWrap: { marginTop: 15, padding: 13, borderRadius: 16, backgroundColor: "#F4F7FA" },
  pathLabel: { fontSize: 10, fontWeight: "900", color: "#7C8791", letterSpacing: 1.1, marginBottom: 4 },
  path: { fontSize: 14, lineHeight: 20, fontWeight: "800", color: "#344454" },
  stepBox: { marginTop: 15, padding: 16, borderRadius: 20, backgroundColor: "#131B24" },
  stepNumber: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2, color: "#92B8E7", marginBottom: 6 },
  step: { fontSize: 18, lineHeight: 25, fontWeight: "800", color: "#FFFFFF" },
  systemRow: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 13 },
  systemDot: { color: "#5B8EC6", fontSize: 13, marginTop: 1 },
  systemText: { flex: 1, fontSize: 12, lineHeight: 17, color: "#64717E" },
  settingsButton: { marginTop: 14, paddingVertical: 13, paddingHorizontal: 15, borderRadius: 16, backgroundColor: "#EAF0F7" },
  settingsButtonText: { textAlign: "center", fontSize: 14, fontWeight: "900", color: "#243C56" },
  note: { fontSize: 11, lineHeight: 16, color: "#7B7B7B", marginTop: 9 },
  actions: { flexDirection: "row", gap: 9, marginTop: 15 },
  secondary: { flex: 1, paddingVertical: 13, borderRadius: 15, backgroundColor: "#EFEFEB" },
  secondaryText: { textAlign: "center", fontSize: 14, fontWeight: "800", color: "#454545" },
  primary: { flex: 1.3, paddingVertical: 13, borderRadius: 15, backgroundColor: "#101820" },
  primaryText: { textAlign: "center", fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  disabled: { opacity: 0.35 }
});
