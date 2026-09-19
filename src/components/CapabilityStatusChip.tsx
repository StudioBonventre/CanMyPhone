import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { liquidIce } from "../theme/liquidIce";
import type { Top100CapabilityLevel } from "../lib/top100Capabilities";

const labels: Record<Top100CapabilityLevel, string> = {
  direct: "Direkt",
  shortcut: "Automatisiert",
  confirm: "iOS-Bestätigung"
};

export function CapabilityStatusChip({ level, compact = false }: { level: Top100CapabilityLevel; compact?: boolean }) {
  const color =
    level === "direct"
      ? liquidIce.color.success
      : level === "shortcut"
        ? liquidIce.color.automation
        : liquidIce.color.confirmation;

  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} />
      <Text style={[styles.text, { color }]}>{compact && level === "confirm" ? "iOS" : labels[level]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 28,
    paddingHorizontal: 9,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: liquidIce.color.glassSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidIce.color.glassBorder
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    shadowOpacity: 0.24,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 }
  },
  text: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700"
  }
});
