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
  const step = session.steps[session.currentStep] ?? "Weiter";
  const isLast = session.currentStep >= session.steps.length - 1;
  const path = solution.settings?.path ?? [];

  return (
    <View style={styles.card}>
      {returnedFromBackground ? (
        <View style={styles.returnBanner}>
          <Text style={styles.returnTitle}>Willkommen zurück.</Text>
          <Text style={styles.returnText}>CanMyPhone hat deinen Platz gespeichert. Weiter geht es mit Schritt {session.currentStep + 1}.</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>SCHRITT FÜR SCHRITT</Text>
          <Text style={styles.title}>{session.title}</Text>
        </View>
        <View style={styles.progressPill}>
          <Text style={styles.progress}>{session.currentStep + 1}/{session.steps.length}</Text>
        </View>
      </View>

      {path.length ? (
        <View style={styles.pathBar}>
          <Text style={styles.pathLabel}>PFAD</Text>
          <Text style={styles.path} numberOfLines={2}>{path.join("  ›  ")}</Text>
        </View>
      ) : null}

      <View style={styles.stepBox}>
        <Text style={styles.stepNumber}>SCHRITT {session.currentStep + 1}</Text>
        <Text style={styles.step}>{step}</Text>
      </View>

      <Text style={styles.companion}>
        {liveActivityActive
          ? "CanMyPhone bleibt als Live-Aktivität sichtbar, während du die App wechselst."
          : "Dein Fortschritt wird gespeichert. Du kannst CanMyPhone verlassen und später genau hier weitermachen."}
      </Text>

      {solution.settings ? (
        <Pressable style={styles.settingsButton} onPress={onLeaveForSettings}>
          <Text style={styles.settingsButtonText}>Nächsten Einrichtungsschritt öffnen</Text>
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          disabled={session.currentStep === 0}
          onPress={onPrevious}
          style={[styles.secondary, session.currentStep === 0 && styles.disabled]}
        >
          <Text style={styles.secondaryText}>Zurück</Text>
        </Pressable>

        {isLast ? (
          <Pressable onPress={onFinish} style={styles.primary}>
            <Text style={styles.primaryText}>Fertig</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onNext} style={styles.primary}>
            <Text style={styles.primaryText}>Weiter</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 32,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.96)",
    shadowColor: "#30465F",
    shadowOpacity: 0.10,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 }
  },
  returnBanner: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(0,122,255,0.08)",
    marginBottom: 18
  },
  returnTitle: { fontSize: 14, fontWeight: "700", color: "#21465C" },
  returnText: { fontSize: 12, lineHeight: 17, color: "#557083", marginTop: 4 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  titleWrap: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.0, color: "#7890A6", marginBottom: 6 },
  title: { fontSize: 22, lineHeight: 27, fontWeight: "700", color: "#17212B" },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(103,119,136,0.10)"
  },
  progress: { fontSize: 12, fontWeight: "700", color: "#5D6D7A" },
  pathBar: {
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "rgba(111,126,143,0.08)"
  },
  pathLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1.0, color: "#8995A2", marginBottom: 5 },
  path: { fontSize: 12, lineHeight: 17, fontWeight: "600", color: "#5F6D7A" },
  stepBox: {
    marginTop: 18,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#111827",
    shadowColor: "#111827",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 }
  },
  stepNumber: { fontSize: 10, fontWeight: "700", letterSpacing: 1.0, color: "#A9C7E1", marginBottom: 8 },
  step: { fontSize: 17, lineHeight: 23, fontWeight: "600", color: "#FFFFFF" },
  companion: { marginTop: 16, fontSize: 12, lineHeight: 17, color: "#6D7882" },
  settingsButton: {
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: "#087BFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#087BFF",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }
  },
  settingsButtonText: { textAlign: "center", fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: "rgba(112,125,140,0.10)",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryText: { textAlign: "center", fontSize: 14, fontWeight: "700", color: "#4B5968" },
  primary: {
    flex: 1.2,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: "#18212D",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryText: { textAlign: "center", fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  disabled: { opacity: 0.35 }
});
