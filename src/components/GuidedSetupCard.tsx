import { Pressable, StyleSheet, Text, View } from "react-native";
import { settingsActionLabel } from "../lib/settings";
import type { GuideSession, Solution } from "../types";

type Props = {
  session: GuideSession;
  solution: Solution;
  returnedFromBackground?: boolean;
  liveActivityActive: boolean;
  beginnerMode?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onLeaveForSettings: () => void;
  onFinish: () => void;
  /** Leave the guide without finishing – always available, so nobody gets stuck. */
  onClose: () => void;
};

export function GuidedSetupCard({
  session,
  solution,
  returnedFromBackground,
  liveActivityActive,
  beginnerMode = false,
  onPrevious,
  onNext,
  onLeaveForSettings,
  onFinish,
  onClose
}: Props) {
  const step = session.steps[session.currentStep] ?? "Weiter";
  const isLast = session.currentStep >= session.steps.length - 1;
  const path = solution.settings?.path ?? [];
  const isAutomation = Boolean(solution.automation);
  const hasSettingsAction = Boolean(solution.settings) || isAutomation;
  const progress = (session.currentStep + 1) / Math.max(1, session.steps.length);

  return (
    <View style={styles.card}>
      {returnedFromBackground ? (
        <View style={styles.returnBanner}>
          <View style={styles.returnDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.returnTitle}>Willkommen zurück</Text>
            <Text style={styles.returnText}>Dein Schritt ist noch da. Du kannst direkt weitermachen.</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.topRow}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Anleitung beenden">
          <Text style={styles.closeText}>Beenden</Text>
        </Pressable>
        <Text style={styles.stepCounter}>Schritt {session.currentStep + 1} von {session.steps.length}</Text>
      </View>
      <View style={styles.progressTrack} accessibilityElementsHidden>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as `${number}%` }]} />
      </View>

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{isAutomation ? "AUTOMATION EINRICHTEN" : "ANLEITUNG"}</Text>
          <Text style={[styles.title, beginnerMode && styles.titleBeginner]}>{session.title}</Text>
        </View>
      </View>

      {path.length ? (
        <View style={styles.pathWrap}>
          <Text style={styles.pathLabel}>Kürzester Pfad</Text>
          <Text style={styles.path}>{path.join("  ›  ")}</Text>
        </View>
      ) : null}

      <View style={[styles.stepBox, beginnerMode && styles.stepBoxBeginner]}>
        <View style={styles.stepOrb}>
          <Text style={styles.stepOrbText}>{session.currentStep + 1}</Text>
        </View>
        <Text style={[styles.step, beginnerMode && styles.stepBeginner]}>{step}</Text>
      </View>

      <Text style={[styles.companion, beginnerMode && styles.companionBeginner]}>
        {isAutomation
          ? "Wechsle ruhig zu Kurzbefehle und wieder zurück – CanMyPhone merkt sich deinen Schritt."
          : liveActivityActive
          ? "CanMyPhone hält diesen Schritt als Live Activity sichtbar, während du die App wechselst."
          : "Dein Fortschritt wird lokal gespeichert. Du kannst die App verlassen und später genau hier weitermachen."}
      </Text>

      {hasSettingsAction ? (
        <Pressable style={styles.settingsButton} onPress={onLeaveForSettings}>
          <Text style={styles.settingsButtonText}>{isAutomation ? "Kurzbefehle öffnen" : settingsActionLabel(solution)}</Text>
        </Pressable>
      ) : null}

      {solution.settings?.note ? <Text style={styles.note}>{solution.settings.note}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          disabled={session.currentStep === 0}
          onPress={onPrevious}
          style={[styles.secondary, session.currentStep === 0 && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Vorheriger Schritt"
        >
          <Text style={styles.secondaryText}>‹ Zurück</Text>
        </Pressable>
        {isLast ? (
          <Pressable onPress={onFinish} style={styles.primary} accessibilityRole="button">
            <Text style={styles.primaryText}>Fertig ✓</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onNext} style={styles.primary} accessibilityRole="button" accessibilityLabel="Nächster Schritt">
            <Text style={styles.primaryText}>Weiter ›</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 30,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
    shadowColor: "#274060",
    shadowOpacity: 0.09,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 }
  },
  returnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: 18,
    backgroundColor: "rgba(231,247,255,0.9)",
    marginBottom: 16
  },
  returnDot: { width: 10, height: 10, borderRadius: 99, backgroundColor: "#0A84FF" },
  returnTitle: { fontSize: 14, fontWeight: "800", color: "#173247" },
  returnText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: "#587083" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  closeText: { fontSize: 15, fontWeight: "600", color: "#087BFF" },
  stepCounter: { fontSize: 12, fontWeight: "700", color: "#7890A6" },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: "rgba(120,144,166,0.18)", marginBottom: 16, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: "#087BFF" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3, color: "#7890A3", marginBottom: 5 },
  title: { fontSize: 22, lineHeight: 27, fontWeight: "800", color: "#101820", letterSpacing: -0.45 },
  titleBeginner: { fontSize: 25, lineHeight: 31 },
  pathWrap: { marginTop: 18, padding: 14, borderRadius: 18, backgroundColor: "rgba(246,249,252,0.86)" },
  pathLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.0, color: "#8A98A5", marginBottom: 6 },
  path: { fontSize: 13, lineHeight: 19, fontWeight: "700", color: "#44515C" },
  stepBox: {
    marginTop: 14,
    minHeight: 130,
    justifyContent: "center",
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#0E1420",
    shadowColor: "#246BFD",
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 }
  },
  stepBoxBeginner: { minHeight: 160, padding: 22 },
  stepOrb: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.11)", marginBottom: 13 },
  stepOrbText: { color: "#DDEBFF", fontSize: 13, fontWeight: "900" },
  step: { fontSize: 18, lineHeight: 25, fontWeight: "700", color: "#FFFFFF" },
  stepBeginner: { fontSize: 22, lineHeight: 30 },
  companion: { marginTop: 13, fontSize: 12, lineHeight: 18, color: "#6D7984" },
  companionBeginner: { fontSize: 15, lineHeight: 22 },
  settingsButton: { marginTop: 15, paddingVertical: 14, paddingHorizontal: 15, borderRadius: 18, backgroundColor: "rgba(232,240,249,0.92)" },
  settingsButtonText: { textAlign: "center", fontSize: 14, fontWeight: "800", color: "#1D405F" },
  note: { marginTop: 9, paddingHorizontal: 4, fontSize: 11, lineHeight: 16, color: "#7C8790" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  secondary: { flex: 1, minHeight: 52, justifyContent: "center", borderRadius: 26, backgroundColor: "rgba(238,242,246,0.95)" },
  secondaryText: { textAlign: "center", fontSize: 16, fontWeight: "700", color: "#4E5963" },
  primary: { flex: 1.3, minHeight: 52, justifyContent: "center", borderRadius: 26, backgroundColor: "#087BFF" },
  primaryText: { textAlign: "center", fontSize: 16, fontWeight: "800", color: "#FFFFFF" },
  disabled: { opacity: 0.34 }
});
