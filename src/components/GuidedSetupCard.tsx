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
          <Text style={styles.returnTitle}>Welcome back.</Text>
          <Text style={styles.returnText}>I kept your place. Continue with step {session.currentStep + 1}.</Text>
        </View>
      ) : null}

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>DROP GUIDE</Text>
          <Text style={styles.title} numberOfLines={2}>{session.title}</Text>
        </View>
        <Text style={styles.progress}>{session.currentStep + 1}/{session.steps.length}</Text>
      </View>

      {path.length ? (
        <Text style={styles.path} numberOfLines={1}>Settings  ›  {path.slice(1).join("  ›  ")}</Text>
      ) : null}

      <View style={styles.stepBox}>
        <Text style={styles.stepNumber}>STEP {session.currentStep + 1}</Text>
        <Text style={styles.step} numberOfLines={3}>{step}</Text>
      </View>

      <Text style={styles.companion} numberOfLines={2}>
        {liveActivityActive
          ? "Drop stays with you in Live Activity while you switch apps."
          : "Your place is saved, so you can leave CanMyPhone and come back anytime."}
      </Text>

      <Pressable style={styles.settingsButton} onPress={onLeaveForSettings}>
        <Text style={styles.settingsButtonText}>Open the next setup step</Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable disabled={session.currentStep === 0} onPress={onPrevious} style={[styles.secondary, session.currentStep === 0 && styles.disabled]}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
        {isLast ? (
          <Pressable onPress={onFinish} style={styles.primary}><Text style={styles.primaryText}>Done</Text></Pressable>
        ) : (
          <Pressable onPress={onNext} style={styles.primary}><Text style={styles.primaryText}>Next</Text></Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(222,229,237,0.9)"
  },
  returnBanner: { padding: 11, borderRadius: 15, backgroundColor: "#EEF8FF", marginBottom: 11 },
  returnTitle: { fontSize: 13, fontWeight: "900", color: "#21465C" },
  returnText: { fontSize: 12, lineHeight: 16, color: "#557083", marginTop: 2 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.3, color: "#7592AD", marginBottom: 3 },
  title: { fontSize: 18, lineHeight: 22, fontWeight: "900", color: "#17212B" },
  progress: { fontSize: 12, fontWeight: "900", color: "#5D6D7A", backgroundColor: "#F0F4F7", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  path: { marginTop: 10, fontSize: 11, fontWeight: "800", color: "#657482" },
  stepBox: { marginTop: 11, padding: 14, borderRadius: 18, backgroundColor: "#121921" },
  stepNumber: { fontSize: 9, fontWeight: "900", letterSpacing: 1.1, color: "#9DBBD3", marginBottom: 5 },
  step: { fontSize: 16, lineHeight: 21, fontWeight: "800", color: "#FFFFFF" },
  companion: { marginTop: 10, fontSize: 11, lineHeight: 15, color: "#6D7882" },
  settingsButton: { marginTop: 11, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 14, backgroundColor: "#EBF1F6" },
  settingsButtonText: { textAlign: "center", fontSize: 13, fontWeight: "900", color: "#263D52" },
  actions: { flexDirection: "row", gap: 8, marginTop: 11 },
  secondary: { flex: 1, paddingVertical: 11, borderRadius: 14, backgroundColor: "#F1F1EE" },
  secondaryText: { textAlign: "center", fontSize: 13, fontWeight: "800", color: "#4B4B4B" },
  primary: { flex: 1.25, paddingVertical: 11, borderRadius: 14, backgroundColor: "#111820" },
  primaryText: { textAlign: "center", fontSize: 13, fontWeight: "900", color: "#FFFFFF" },
  disabled: { opacity: 0.35 }
});
