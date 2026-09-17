import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { isPermissionSettingsFlow, isShortcutSettingsFlow, settingsActionLabel } from "../lib/settings";
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
  onFinish
}: Props) {
  const step = session.steps[session.currentStep] ?? "Weiter";
  const isLast = session.currentStep >= session.steps.length - 1;
  const path = solution.settings?.path ?? [];
  const permissionFlow = isPermissionSettingsFlow(solution);
  const shortcutFlow = isShortcutSettingsFlow(solution) && !permissionFlow;
  const hasSettingsAction = Boolean(solution.settings) || shortcutFlow;

  return (
    <View style={styles.card}>
      {returnedFromBackground ? (
        <View style={styles.returnBanner}>
          <View style={styles.returnIcon}>
            <View style={styles.returnDot} />
          </View>
          <View style={styles.returnTextWrap}>
            <Text style={styles.returnTitle}>Willkommen zurück</Text>
            <Text style={styles.returnText}>Dein Guide ist noch genau an derselben Stelle.</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>CANMYPHONE GUIDE</Text>
          <Text style={[styles.title, beginnerMode && styles.titleBeginner]}>{session.title}</Text>
        </View>
        <View style={styles.progressPill}>
          <Text style={styles.progress}>{session.currentStep + 1}</Text>
          <Text style={styles.progressDivider}>/</Text>
          <Text style={styles.progressTotal}>{session.steps.length}</Text>
        </View>
      </View>

      {path.length ? (
        <View style={styles.pathWrap}>
          <Text style={styles.pathLabel}>
            {permissionFlow ? "FALLS DU SCHON ABGELEHNT HAST" : shortcutFlow ? "LETZTER SYSTEMSCHRITT" : "KÜRZESTER PFAD"}
          </Text>
          <Text style={styles.path}>{path.join("  ›  ")}</Text>
        </View>
      ) : null}

      <View style={[styles.stepBox, beginnerMode && styles.stepBoxBeginner]}>
        <View style={styles.stepAccent} />
        <View style={styles.stepTopRow}>
          <View style={styles.stepOrb}>
            <Text style={styles.stepOrbText}>{session.currentStep + 1}</Text>
          </View>
          <Text style={styles.stepLabel}>JETZT</Text>
        </View>
        <Text style={[styles.step, beginnerMode && styles.stepBeginner]}>{step}</Text>
      </View>

      <View style={styles.companionRow}>
        <View style={[styles.statusDot, liveActivityActive && styles.statusDotActive]} />
        <Text style={[styles.companion, beginnerMode && styles.companionBeginner]}>
          {liveActivityActive
            ? "Der nächste Schritt bleibt als Live Activity sichtbar, wenn du CanMyPhone verlässt."
            : "Dein Fortschritt bleibt lokal gespeichert. Du kannst jederzeit hier weitermachen."}
        </Text>
      </View>

      {hasSettingsAction ? (
        <>
          <Pressable
            style={[styles.settingsButton, (permissionFlow || shortcutFlow) && styles.settingsButtonPermission]}
            onPress={onLeaveForSettings}
          >
            <Text style={[styles.settingsButtonText, (permissionFlow || shortcutFlow) && styles.settingsButtonTextPermission]}>
              {settingsActionLabel(solution)}
            </Text>
            <Text style={[styles.settingsButtonArrow, (permissionFlow || shortcutFlow) && styles.settingsButtonArrowPermission]}>›</Text>
          </Pressable>
          {permissionFlow ? (
            <Text style={styles.permissionHint}>
              Beim ersten Mal erscheint direkt der iOS-Systemdialog. Nach einer Ablehnung öffnen sich die passenden App-Einstellungen.
            </Text>
          ) : shortcutFlow ? (
            <Text style={styles.permissionHint}>
              CanMyPhone nutzt dafür nur Apples offiziellen Kurzbefehle-Deep-Link. Systemzuordnungen, die iOS nicht freigibt, bestätigst du einmal selbst.
            </Text>
          ) : null}
        </>
      ) : null}

      {!permissionFlow && !shortcutFlow && solution.settings?.note ? <Text style={styles.note}>{solution.settings.note}</Text> : null}

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
    borderRadius: 34,
    padding: 22,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.98)",
    shadowColor: "#476A90",
    shadowOpacity: 0.12,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 16 }
  },
  returnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(232,247,255,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(10,132,255,0.12)",
    marginBottom: 20
  },
  returnIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,132,255,0.11)"
  },
  returnDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: "#0A84FF",
    shadowColor: "#0A84FF",
    shadowOpacity: 0.5,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 }
  },
  returnTextWrap: { flex: 1 },
  returnTitle: { fontSize: 14, fontWeight: "800", color: "#163047" },
  returnText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: "#60788B" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.35, color: "#7189A0", marginBottom: 7 },
  title: { fontSize: 23, lineHeight: 28, fontWeight: "800", color: "#0F1722", letterSpacing: -0.5 },
  titleBeginner: { fontSize: 26, lineHeight: 32 },
  progressPill: {
    minWidth: 56,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    backgroundColor: "rgba(236,242,249,0.95)"
  },
  progress: { fontSize: 12, fontWeight: "900", color: "#1E3449" },
  progressDivider: { marginHorizontal: 2, fontSize: 12, fontWeight: "700", color: "#9AA7B3" },
  progressTotal: { fontSize: 12, fontWeight: "800", color: "#7C8996" },
  pathWrap: {
    marginTop: 20,
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "rgba(244,248,252,0.94)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(68,91,115,0.08)"
  },
  pathLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.05, color: "#8394A4", marginBottom: 7 },
  path: { fontSize: 13, lineHeight: 19, fontWeight: "700", color: "#3C4D5D" },
  stepBox: {
    marginTop: 16,
    minHeight: 146,
    justifyContent: "center",
    padding: 20,
    borderRadius: 27,
    overflow: "hidden",
    backgroundColor: "#0B1320",
    shadowColor: "#246BFD",
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 }
  },
  stepBoxBeginner: { minHeight: 176, padding: 23 },
  stepAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#0A84FF",
    shadowColor: "#5AC8FA",
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 }
  },
  stepTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  stepOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,160,255,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(120,200,255,0.28)"
  },
  stepOrbText: { color: "#EAF5FF", fontSize: 13, fontWeight: "900" },
  stepLabel: { marginLeft: 10, fontSize: 9, fontWeight: "900", letterSpacing: 1.3, color: "rgba(214,231,248,0.58)" },
  step: { fontSize: 19, lineHeight: 26, fontWeight: "700", color: "#FFFFFF", letterSpacing: -0.2 },
  stepBeginner: { fontSize: 23, lineHeight: 31 },
  companionRow: { marginTop: 15, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  statusDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: "#B7C0CA", marginTop: 6 },
  statusDotActive: {
    backgroundColor: "#34C759",
    shadowColor: "#34C759",
    shadowOpacity: 0.45,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 }
  },
  companion: { flex: 1, fontSize: 12, lineHeight: 18, color: "#687684" },
  companionBeginner: { fontSize: 15, lineHeight: 22 },
  settingsButton: {
    marginTop: 18,
    minHeight: 54,
    paddingVertical: 15,
    paddingLeft: 17,
    paddingRight: 13,
    borderRadius: 21,
    backgroundColor: "rgba(235,242,249,0.96)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  settingsButtonPermission: {
    backgroundColor: "#0A84FF",
    shadowColor: "#0A84FF",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 }
  },
  settingsButtonText: { fontSize: 14, fontWeight: "800", color: "#1A415F" },
  settingsButtonTextPermission: { color: "#FFFFFF" },
  settingsButtonArrow: { fontSize: 24, lineHeight: 24, color: "#72879A", marginTop: -2 },
  settingsButtonArrowPermission: { color: "rgba(255,255,255,0.9)" },
  permissionHint: { marginTop: 10, paddingHorizontal: 4, fontSize: 11, lineHeight: 16, color: "#73808C" },
  note: { marginTop: 10, paddingHorizontal: 4, fontSize: 11, lineHeight: 16, color: "#7A8792" },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  secondary: {
    flex: 1,
    minHeight: 50,
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(239,243,247,0.98)"
  },
  secondaryText: { textAlign: "center", fontSize: 14, fontWeight: "800", color: "#4D5A66" },
  primary: {
    flex: 1.3,
    minHeight: 50,
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "#111924",
    shadowColor: "#111924",
    shadowOpacity: 0.13,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  primaryText: { textAlign: "center", fontSize: 14, fontWeight: "900", color: "#FFFFFF" },
  disabled: { opacity: 0.32 }
});
