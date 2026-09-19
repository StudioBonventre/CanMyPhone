import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  consumeRecentPermissionGrant,
  isPermissionSettingsFlow,
  isShortcutSettingsFlow,
  settingsActionLabel
} from "../lib/settings";
import type { GuideSession, Solution } from "../types";
import { liquidIce } from "../theme/liquidIce";
import { GlassSurface } from "./GlassSurface";
import { ContentSurface } from "./ContentSurface";
import { LiquidButton } from "./LiquidButton";

type Props = {
  session: GuideSession;
  solution: Solution;
  returnedFromBackground?: boolean;
  liveActivityActive: boolean;
  beginnerMode?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onLeaveForSettings: () => void | Promise<void>;
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
  const isFirst = session.currentStep === 0;
  const isLast = session.currentStep >= session.steps.length - 1;
  const path = solution.settings?.path ?? [];
  const permissionFlow = isPermissionSettingsFlow(solution);
  const shortcutFlow = isShortcutSettingsFlow(solution) && !permissionFlow;
  const appSettingsFlow = solution.settings?.openMode === "app-settings" && !permissionFlow;
  const hasSettingsAction = permissionFlow || shortcutFlow || appSettingsFlow;
  const manualSystemFlow = Boolean(solution.settings) && !hasSettingsAction;

  const handleSettingsPress = async () => {
    await onLeaveForSettings();
    if (permissionFlow && consumeRecentPermissionGrant()) {
      if (isLast) onFinish();
      else onNext();
    }
  };

  return (
    <GlassSurface variant="floating" style={styles.card}>
      <View pointerEvents="none" style={styles.cardTopLight} />
      <View pointerEvents="none" style={styles.cardBloom} />

      {returnedFromBackground ? (
        <ContentSurface style={styles.returnBanner}>
          <View style={styles.returnIcon}>
            <View style={styles.returnDot} />
          </View>
          <View style={styles.returnTextWrap}>
            <Text style={styles.returnTitle}>Willkommen zurück</Text>
            <Text style={styles.returnText}>Dein Guide ist noch genau an derselben Stelle.</Text>
          </View>
        </GlassSurface>
      ) : null}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>CANMYPHONE GUIDE</Text>
          <Text style={[styles.title, beginnerMode && styles.titleBeginner]}>{session.title}</Text>
        </View>
        <View style={styles.progressPill} accessibilityLabel={`Schritt ${session.currentStep + 1} von ${session.steps.length}`}>
          <Text style={styles.progress}>{session.currentStep + 1}</Text>
          <Text style={styles.progressDivider}>/</Text>
          <Text style={styles.progressTotal}>{session.steps.length}</Text>
        </View>
      </View>

      {path.length ? (
        <ContentSurface style={styles.pathWrap}>
          <View pointerEvents="none" style={styles.innerTopLight} />
          <Text style={styles.pathLabel}>
            {permissionFlow ? "FALLS DU SCHON ABGELEHNT HAST" : shortcutFlow ? "LETZTER SYSTEMSCHRITT" : "KÜRZESTER PFAD"}
          </Text>
          <Text style={styles.path}>{path.join("  ›  ")}</Text>
        </GlassSurface>
      ) : null}

      <GlassSurface variant="surface" style={[styles.stepBox, beginnerMode && styles.stepBoxBeginner]}>
        <View pointerEvents="none" style={styles.stepGlow} />
        <View pointerEvents="none" style={styles.innerTopLight} />
        <View style={styles.stepTopRow}>
          <View style={styles.stepOrb}>
            <Text style={styles.stepOrbText}>{session.currentStep + 1}</Text>
          </View>
          <Text style={styles.stepLabel}>JETZT</Text>
        </View>
        <Text style={[styles.step, beginnerMode && styles.stepBeginner]}>{step}</Text>
      </ContentSurface>

      <View style={styles.companionRow}>
        <View style={[styles.statusDot, liveActivityActive && styles.statusDotActive]} />
        <Text style={[styles.companion, beginnerMode && styles.companionBeginner]}>
          {liveActivityActive
            ? beginnerMode
              ? "Der nächste Schritt bleibt oben auf deinem iPhone sichtbar, wenn du CanMyPhone verlässt."
              : "Der nächste Schritt bleibt als Live Activity sichtbar, wenn du CanMyPhone verlässt."
            : "Dein Fortschritt bleibt lokal gespeichert. Du kannst jederzeit hier weitermachen."}
        </Text>
      </View>

      {hasSettingsAction ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => handleSettingsPress().catch(() => undefined)}
            style={({ pressed }) => [styles.settingsPressable, pressed && styles.buttonPressed]}
          >
            <ContentSurface
              emphasis={permissionFlow || shortcutFlow ? "active" : "quiet"}
              style={[
                styles.settingsButton,
                (permissionFlow || shortcutFlow) && styles.settingsButtonPermission
              ]}
            >
              <Text style={[styles.settingsButtonText, (permissionFlow || shortcutFlow) && styles.settingsButtonTextPermission]}>
                {settingsActionLabel(solution)}
              </Text>
              <Text style={[styles.settingsButtonArrow, (permissionFlow || shortcutFlow) && styles.settingsButtonArrowPermission]}>›</Text>
            </ContentSurface>
          </Pressable>
          {permissionFlow ? (
            <Text style={styles.permissionHint}>
              Beim ersten Mal erscheint direkt der iOS-Systemdialog. Sobald du erlaubst, geht CanMyPhone automatisch zum nächsten Schritt.
            </Text>
          ) : shortcutFlow ? (
            <Text style={styles.permissionHint}>
              CanMyPhone nutzt dafür Apples offiziellen Kurzbefehle-Link. Den letzten von iOS geschützten Systemschritt bestätigst du selbst.
            </Text>
          ) : null}
        </>
      ) : null}

      {manualSystemFlow ? (
        <Text style={styles.note}>
          Für diesen Systembereich bietet iOS keinen öffentlichen Direktlink. Deshalb zeigt CanMyPhone dir den kürzesten erlaubten Pfad statt eines Buttons, der nur scheinbar etwas öffnet.
        </Text>
      ) : !permissionFlow && !shortcutFlow && solution.settings?.note ? (
        <Text style={styles.note}>{solution.settings.note}</Text>
      ) : null}

      <View style={styles.actions}>
        {!isFirst ? (
          <LiquidButton
            variant="glass"
            label="Vorheriger Schritt"
            onPress={onPrevious}
            style={styles.secondary}
          />
        ) : null}
        <LiquidButton
          label={isLast ? "Fertig" : "Weiter"}
          onPress={isLast ? onFinish : onNext}
          style={[styles.primary, isFirst && styles.primarySolo]}
        />
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 36,
    padding: 22,
    overflow: "hidden",
   },
  cardTopLight: { position: "absolute", left: 24, right: 24, top: 1, height: 1, backgroundColor: "rgba(255,255,255,0.94)" },
  cardBloom: { position: "absolute", right: -70, top: -80, width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(164,216,255,0.12)" },
  innerTopLight: { position: "absolute", left: 16, right: 16, top: 1, height: 1, backgroundColor: "rgba(255,255,255,0.88)" },
  buttonTopLight: { position: "absolute", left: 14, right: 14, top: 1, height: 1, backgroundColor: "rgba(255,255,255,0.88)" },
  returnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20
  },
  returnIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,132,255,0.09)" },
  returnDot: { width: 9, height: 9, borderRadius: 99, backgroundColor: "#0A84FF", shadowColor: "#0A84FF", shadowOpacity: 0.45, shadowRadius: 7, shadowOffset: { width: 0, height: 0 } },
  returnTextWrap: { flex: 1 },
  returnTitle: { fontSize: 14, fontWeight: "800", color: liquidIce.color.textPrimary },
  returnText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: liquidIce.color.textSecondary },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  headerText: { flex: 1 },
  eyebrow: { ...liquidIce.type.eyebrow, color: liquidIce.color.textTertiary, marginBottom: 7 },
  title: { ...liquidIce.type.titleMedium, fontWeight: "700", color: liquidIce.color.textPrimary },
  titleBeginner: { fontSize: 26, lineHeight: 32 },
  progressPill: { minWidth: 56, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, flexDirection: "row", justifyContent: "center", backgroundColor: "rgba(211,235,252,0.24)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.78)" },
  progress: { fontSize: 12, fontWeight: "900", color: "#1E5B86" },
  progressDivider: { marginHorizontal: 2, fontSize: 12, fontWeight: "700", color: "#9AA7B3" },
  progressTotal: { fontSize: 12, fontWeight: "800", color: "#7C8996" },
  pathWrap: { marginTop: 20, paddingHorizontal: 15, paddingVertical: 14, borderRadius: 22, overflow: "hidden" },
  pathLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.05, color: "#7392AA", marginBottom: 7 },
  path: { fontSize: 13, lineHeight: 19, fontWeight: "700", color: liquidIce.color.textSecondary },
  stepBox: { marginTop: 16, minHeight: 150, justifyContent: "center", padding: 20, borderRadius: 29, overflow: "hidden" },
  stepBoxBeginner: { minHeight: 176, padding: 23 },
  stepGlow: { position: "absolute", width: 180, height: 180, borderRadius: 90, right: -46, top: -66, backgroundColor: "rgba(139,207,255,0.14)" },
  stepTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  stepOrb: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(125,194,247,0.16)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.80)" },
  stepOrbText: { color: "#236FA8", fontSize: 13, fontWeight: "900" },
  stepLabel: { marginLeft: 10, fontSize: 9, fontWeight: "900", letterSpacing: 1.3, color: "#7193AD" },
  step: { fontSize: 19, lineHeight: 26, fontWeight: "700", color: liquidIce.color.textPrimary, letterSpacing: -0.2 },
  stepBeginner: { fontSize: 23, lineHeight: 31 },
  companionRow: { marginTop: 15, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  statusDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: "#B7C0CA", marginTop: 6 },
  statusDotActive: { backgroundColor: "#34C759", shadowColor: "#34C759", shadowOpacity: 0.45, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  companion: { flex: 1, fontSize: 12, lineHeight: 18, color: liquidIce.color.textSecondary },
  companionBeginner: { fontSize: 15, lineHeight: 22 },
  settingsPressable: { marginTop: 18, borderRadius: 23 },
  settingsButton: { minHeight: 54, paddingVertical: 15, paddingLeft: 17, paddingRight: 13, borderRadius: 23, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden" },
  settingsButtonPermission: { borderColor: "rgba(128,222,255,0.58)" },
  settingsButtonText: { fontSize: 14, fontWeight: "800", color: "#315E7E" },
  settingsButtonTextPermission: { color: "#146EA9" },
  settingsButtonArrow: { fontSize: 24, lineHeight: 24, color: "#72879A", marginTop: -2 },
  settingsButtonArrowPermission: { color: "#2D7FB8" },
  permissionHint: { marginTop: 10, paddingHorizontal: 4, ...liquidIce.type.caption, color: liquidIce.color.textTertiary },
  note: { marginTop: 10, paddingHorizontal: 4, ...liquidIce.type.caption, color: liquidIce.color.textTertiary },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  secondary: { flex: 1 },
  secondaryText: { textAlign: "center", fontSize: 13, fontWeight: "800", color: "#536879" },
  primary: { flex: 1.3 },
  primarySolo: { flex: 1 },
  primaryText: { textAlign: "center", fontSize: 14, fontWeight: "900", color: "#176DA9" },
  buttonPressed: { transform: [{ scale: liquidIce.motion.pressScale }], opacity: 0.86 }
});
