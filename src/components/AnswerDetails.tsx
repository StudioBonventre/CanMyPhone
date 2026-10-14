import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { Solution } from "../types";

function setupTimeLabel(minutes: number): string {
  if (minutes <= 0) return "Sofort";
  if (minutes === 1) return "ca. 1 Minute";
  return `ca. ${minutes} Minuten`;
}

/**
 * Everything a person needs to judge an answer before acting on it:
 * cost, time, requirements, the steps themselves and the official source.
 */
export function AnswerDetails({ solution, beginnerMode }: { solution: Solution; beginnerMode: boolean }) {
  const openSource = (url: string) => {
    Linking.openURL(url).catch(() => undefined);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        <Text style={[styles.chip, solution.builtIn && styles.chipGood]}>{solution.builtIn ? "Schon eingebaut" : "Mit App"}</Text>
        <Text style={styles.chip}>{solution.cost}</Text>
        <Text style={styles.chip}>{setupTimeLabel(solution.setupMinutes)}</Text>
      </View>

      {solution.voice?.invocation ? (
        <View style={styles.voiceBox}>
          <Text style={styles.sectionLabel}>SO SAGST DU ES SIRI</Text>
          <Text style={styles.voiceText}>{solution.voice.invocation}</Text>
        </View>
      ) : null}

      {solution.requirements?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VORAUSSETZUNGEN</Text>
          {solution.requirements.map((requirement) => (
            <Text key={requirement} style={styles.requirement}>• {requirement}</Text>
          ))}
        </View>
      ) : null}

      {!beginnerMode ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SO GEHT'S</Text>
          {solution.steps.map((step, index) => (
            <View key={`${solution.id}-step-${index}`} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          {solution.settings?.path?.length ? (
            <Text style={styles.path}>{solution.settings.path.join(" › ")}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>QUELLE</Text>
        {solution.sources.map((source) => (
          <Pressable
            key={source.url}
            onPress={() => openSource(source.url)}
            accessibilityRole="link"
            accessibilityLabel={`${source.label} öffnen`}
            hitSlop={6}
          >
            <Text style={styles.source}>{source.label} ↗</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function AlternativeList({
  solutions,
  title,
  onSelect
}: {
  solutions: Solution[];
  title: string;
  onSelect: (solution: Solution) => void;
}) {
  if (!solutions.length) return null;
  return (
    <View style={styles.alternatives}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {solutions.map((solution, index) => (
        <View key={solution.id}>
          <Pressable style={styles.alternativeRow} onPress={() => onSelect(solution)} accessibilityRole="button">
            <View style={styles.alternativeTextWrap}>
              <Text style={styles.alternativeTitle}>{solution.title}</Text>
              <Text style={styles.alternativeSummary} numberOfLines={2}>{solution.summary}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          {index < solutions.length - 1 ? <View style={styles.divider} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    fontSize: 12, fontWeight: "700", color: "#46566A", backgroundColor: "rgba(255,255,255,0.78)",
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, overflow: "hidden"
  },
  chipGood: { color: "#11683A", backgroundColor: "rgba(214,245,226,0.9)" },
  voiceBox: { marginTop: 16, padding: 14, borderRadius: 18, backgroundColor: "rgba(238,233,255,0.86)" },
  voiceText: { fontSize: 15, lineHeight: 21, fontWeight: "700", color: "#2A2149" },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, color: "#7890A6", marginBottom: 8 },
  requirement: { fontSize: 14, lineHeight: 20, color: "#3A4757", marginBottom: 3 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 9 },
  stepNumber: {
    width: 22, height: 22, borderRadius: 11, marginRight: 10, marginTop: 0, overflow: "hidden",
    textAlign: "center", lineHeight: 22, fontSize: 12, fontWeight: "800", color: "#FFFFFF", backgroundColor: "#087BFF"
  },
  stepText: { flex: 1, fontSize: 15, lineHeight: 21, color: "#202B39" },
  path: { marginTop: 4, fontSize: 12, lineHeight: 17, color: "#6B7786", fontWeight: "600" },
  source: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#007AFF", marginBottom: 6 },
  alternatives: { marginTop: 26 },
  alternativeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, minHeight: 56 },
  alternativeTextWrap: { flex: 1, paddingRight: 10 },
  alternativeTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: "#202B39" },
  alternativeSummary: { marginTop: 3, fontSize: 12, lineHeight: 16, color: "#7C8795" },
  chevron: { fontSize: 25, color: "#A1A9B4" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(70,86,104,0.13)" }
});
