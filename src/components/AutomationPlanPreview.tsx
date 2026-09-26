import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AutomationPlan } from "../automation/types";
import { liquidIce } from "../theme/liquidIce";
import { ContentSurface } from "./ContentSurface";
import { LiquidButton } from "./LiquidButton";

type Props = { plan: AutomationPlan; pro: boolean; providerConnected?: boolean; onConnect: () => void; onCreate?: () => void };

const execution = {
  "on-device": "Auf deinem iPhone",
  server: "CanMyPhone Server",
  "shortcut-handoff": "Apple Kurzbefehle",
  guided: "Mit deiner Bestätigung"
} as const;

function triggerText(plan: AutomationPlan): string {
  const trigger = plan.triggers[0];
  if (!trigger) return "Wenn du sie startest";
  if (trigger.kind === "geofence-exit") return "Wenn du einen festgelegten Bereich verlässt";
  if (trigger.kind === "shortcut") return "Wenn Apple Kurzbefehle sie auslöst";
  return "Wenn du sie startest";
}

function actionText(plan: AutomationPlan): string {
  const action = plan.actions[0];
  if (!action) return "Die gewünschte Aktion ausführen";
  const id = action.capabilityId.toLowerCase();
  if (id.includes("trunk") || id.includes("liftgate")) return "Heckkofferraum schließen";
  if (id.includes("brightness")) return "Displayhelligkeit ändern";
  return "Die gewünschte Aktion ausführen";
}

export function AutomationPlanPreview({ plan, pro, providerConnected = false, onConnect, onCreate }: Props) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const setupNeeded = plan.authorizations.length > 0;
  const providerRequired =
    plan.actions.some((action) => action.kind === "tesla-command") ||
    plan.authorizations.some((item) => item.provider === "tesla");
  const providerPending = providerRequired && !providerConnected;

  return (
    <ContentSurface style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>AUTOMATION</Text>
          <Text style={styles.title}>{plan.title}</Text>
        </View>
        {plan.requiresPro ? (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>{pro ? "PRO" : "PRO NÖTIG"}</Text>
          </View>
        ) : null}
      </View>

      {plan.explanation[0] ? <Text style={styles.summary}>{plan.explanation[0]}</Text> : null}

      <View style={styles.flow}>
        <View style={styles.flowRow}>
          <Text style={styles.flowLabel}>Wenn</Text>
          <Text style={styles.flowValue}>{triggerText(plan)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.flowRow}>
          <Text style={styles.flowLabel}>Dann</Text>
          <Text style={styles.flowValue}>{actionText(plan)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{execution[plan.executionMode]}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>
          {providerPending
            ? "Verbindung nötig"
            : plan.confirmationRequired
              ? "Bestätigung nötig"
              : setupNeeded
                ? "Einmal einrichten"
                : "Bereit"}
        </Text>
      </View>

      {providerPending ? (
        <View style={styles.pendingNotice}>
          <Text style={styles.pendingTitle}>Tesla noch verbinden</Text>
          <Text style={styles.pendingText}>
            Melde dein Tesla-Konto einmalig an und bestätige den virtuellen Fahrzeugschlüssel. Danach kann CanMyPhone die Automation sicher erstellen.
          </Text>
        </View>
      ) : null}

      {detailsVisible ? (
        <View style={styles.details}>
          {plan.authorizations.length ? (
            <>
              <Text style={styles.detailHeading}>Einmalig nötig</Text>
              {plan.authorizations.map((item) => (
                <View key={item.id} style={styles.detailRow}>
                  <Text style={styles.detailBullet}>•</Text>
                  <Text style={styles.detailText}>{item.reason}</Text>
                </View>
              ))}
            </>
          ) : null}

          {plan.fallbacks.length ? (
            <>
              <Text style={[styles.detailHeading, styles.detailHeadingSpaced]}>Falls etwas nicht klappt</Text>
              {plan.fallbacks.map((item) => (
                <View key={item.id} style={styles.detailRow}>
                  <Text style={styles.detailBullet}>•</Text>
                  <Text style={styles.detailText}>{item.message}</Text>
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.truth}>
            Noch nicht aktiv. CanMyPhone zeigt die Automation erst als aktiv an, wenn alle nötigen Verbindungen und Freigaben bestätigt sind.
          </Text>
        </View>
      ) : null}

      <Pressable onPress={() => setDetailsVisible((current) => !current)} style={styles.detailsButton}>
        <Text style={styles.detailsButtonText}>{detailsVisible ? "Details ausblenden" : "Details anzeigen"}</Text>
      </Pressable>

      <LiquidButton
        style={styles.button}
        label={providerPending ? "Tesla verbinden" : onCreate ? "Automation einrichten" : setupNeeded ? "Einrichtung starten" : "Automation erstellen"}
        onPress={providerPending ? onConnect : (onCreate ?? onConnect)}
      />
    </ContentSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    gap: 0
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  titleWrap: {
    flex: 1
  },
  eyebrow: {
    ...liquidIce.type.eyebrow,
    color: liquidIce.color.textTertiary,
    marginBottom: 7
  },
  title: {
    ...liquidIce.type.titleMedium,
    color: liquidIce.color.textPrimary
  },
  proBadge: {
    borderRadius: 999,
    backgroundColor: "#EEEEEE",
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  proBadgeText: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: liquidIce.color.textSecondary
  },
  summary: {
    marginTop: 10,
    ...liquidIce.type.bodyMedium,
    color: liquidIce.color.textSecondary
  },
  flow: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 16
  },
  flowRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  flowLabel: {
    width: 44,
    fontSize: 12,
    fontWeight: "700",
    color: liquidIce.color.textTertiary
  },
  flowValue: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
    color: liquidIce.color.textPrimary
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: liquidIce.color.divider,
    marginLeft: 58
  },
  metaRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap"
  },
  metaText: {
    ...liquidIce.type.caption,
    color: liquidIce.color.textSecondary
  },
  metaDot: {
    marginHorizontal: 7,
    color: liquidIce.color.textTertiary
  },
  pendingNotice: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F4F4F4"
  },
  pendingTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: liquidIce.color.textPrimary
  },
  pendingText: {
    marginTop: 4,
    ...liquidIce.type.caption,
    color: liquidIce.color.textSecondary
  },
  details: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: liquidIce.color.divider
  },
  detailHeading: {
    ...liquidIce.type.labelLarge,
    color: liquidIce.color.textPrimary,
    marginBottom: 8
  },
  detailHeadingSpaced: {
    marginTop: 16
  },
  detailRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 7
  },
  detailBullet: {
    color: liquidIce.color.textTertiary
  },
  detailText: {
    flex: 1,
    ...liquidIce.type.bodyMedium,
    color: liquidIce.color.textSecondary
  },
  truth: {
    marginTop: 14,
    ...liquidIce.type.caption,
    color: liquidIce.color.textTertiary
  },
  detailsButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    paddingVertical: 6
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: liquidIce.color.textSecondary
  },
  button: {
    marginTop: 14
  }
});
