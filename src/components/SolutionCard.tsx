import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Solution, SolutionFeedback } from "../types";

const feedbackOptions: { value: SolutionFeedback; label: string }[] = [
  { value: "worked", label: "Worked" },
  { value: "didnt_work", label: "Didn't work" },
  { value: "already_knew", label: "Already knew" },
  { value: "not_relevant", label: "Not relevant" }
];

function voiceLabel(solution: Solution): string | null {
  if (!solution.voice || solution.voice.route === "none") return null;
  if (solution.voice.route === "siri-direct") return "SIRI DIRECT";
  if (solution.voice.route === "shortcut") return "SIRI + SHORTCUTS";
  if (solution.voice.route === "siri-ai") return "SIRI AI";
  return null;
}

export function SolutionCard({
  solution,
  best,
  reason,
  onOpen,
  onFeedback
}: {
  solution: Solution;
  best?: boolean;
  reason?: string;
  onOpen?: (solution: Solution) => void;
  onFeedback?: (solution: Solution, feedback: SolutionFeedback) => void;
}) {
  const [expanded, setExpanded] = useState(Boolean(best));
  const [feedback, setFeedback] = useState<SolutionFeedback | null>(null);
  const siriLabel = voiceLabel(solution);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) onOpen?.(solution);
  };

  const chooseFeedback = (value: SolutionFeedback) => {
    setFeedback(value);
    onFeedback?.(solution, value);
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.badge}>{solution.builtIn ? "BUILT IN" : "APP BRIDGE"}</Text>
        {siriLabel ? <Text style={styles.siriBadge}>{siriLabel}</Text> : null}
        {best ? <Text style={styles.best}>BEST MATCH</Text> : null}
      </View>
      <Text style={styles.title}>{solution.title}</Text>
      {reason ? <Text style={styles.reason}>Why this fits: {reason}</Text> : null}
      <Text style={styles.summary}>{solution.summary}</Text>
      <Text style={styles.meta}>{solution.cost} · ~{solution.setupMinutes} min setup</Text>

      {solution.voice?.invocation ? (
        <View style={styles.voiceBox}>
          <Text style={styles.voiceTitle}>Say it</Text>
          <Text style={styles.voiceText}>{solution.voice.invocation}</Text>
        </View>
      ) : null}

      <Pressable onPress={toggleExpanded}>
        <Text style={styles.link}>{expanded ? "Hide setup" : "Show setup"}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.details}>
          {solution.voice?.note ? (
            <>
              <Text style={styles.section}>Siri route</Text>
              <Text style={styles.step}>{solution.voice.note}</Text>
              {solution.voice.fallback ? <Text style={styles.fallback}>Fallback: {solution.voice.fallback}</Text> : null}
            </>
          ) : null}

          {solution.requirements?.length ? (
            <>
              <Text style={styles.section}>Requirements</Text>
              {solution.requirements.map((r) => <Text key={r} style={styles.step}>• {r}</Text>)}
            </>
          ) : null}
          <Text style={styles.section}>How to set it up</Text>
          {solution.steps.map((step, i) => <Text key={`${solution.id}-${i}`} style={styles.step}>{i + 1}. {step}</Text>)}

          {solution.sources.map((source) => (
            <Pressable key={source.url} onPress={() => Linking.openURL(source.url)}>
              <Text style={styles.source}>Verify with {source.label} ↗</Text>
            </Pressable>
          ))}

          <Text style={styles.feedbackTitle}>Was this useful?</Text>
          <View style={styles.feedbackRow}>
            {feedbackOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => chooseFeedback(option.value)}
                style={[styles.feedbackButton, feedback === option.value && styles.feedbackButtonActive]}
              >
                <Text style={[styles.feedbackText, feedback === option.value && styles.feedbackTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: "#EAEAEA" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  badge: { fontSize: 11, fontWeight: "800", letterSpacing: 1, backgroundColor: "#EAF7EE", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  siriBadge: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: "#3C2A86", backgroundColor: "#EEE9FF", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  best: { fontSize: 11, fontWeight: "800", letterSpacing: 1, backgroundColor: "#EFEAFF", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  title: { fontSize: 21, lineHeight: 25, fontWeight: "800", color: "#111111" },
  reason: { fontSize: 13, lineHeight: 18, fontWeight: "700", color: "#5B54D6", marginTop: 8 },
  summary: { fontSize: 15, lineHeight: 21, color: "#555555", marginTop: 8 },
  meta: { fontSize: 13, color: "#777777", marginTop: 12 },
  voiceBox: { marginTop: 14, padding: 12, borderRadius: 15, backgroundColor: "#F6F2FF" },
  voiceTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 1, color: "#6551B8", marginBottom: 4 },
  voiceText: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#2A2149" },
  link: { marginTop: 16, fontSize: 15, fontWeight: "700", color: "#3B36D6" },
  details: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#EEEEEE" },
  section: { fontSize: 14, fontWeight: "800", marginTop: 8, marginBottom: 6 },
  step: { fontSize: 14, lineHeight: 20, color: "#333333", marginBottom: 5 },
  fallback: { fontSize: 13, lineHeight: 19, color: "#666666", fontStyle: "italic", marginTop: 3, marginBottom: 5 },
  source: { fontSize: 13, fontWeight: "700", color: "#3B36D6", marginTop: 10 },
  feedbackTitle: { fontSize: 13, fontWeight: "800", color: "#333333", marginTop: 18, marginBottom: 9 },
  feedbackRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  feedbackButton: { borderRadius: 999, backgroundColor: "#F0F0EC", paddingHorizontal: 10, paddingVertical: 7 },
  feedbackButtonActive: { backgroundColor: "#111111" },
  feedbackText: { fontSize: 12, fontWeight: "700", color: "#4A4A4A" },
  feedbackTextActive: { color: "#FFFFFF" }
});
