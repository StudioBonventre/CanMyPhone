import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { liquidIce } from "../theme/liquidIce";
import type { Top100CapabilityLevel } from "../lib/top100Capabilities";
import { ContentSurface } from "./ContentSurface";
import { CapabilityStatusChip } from "./CapabilityStatusChip";

type Props = {
  level: Top100CapabilityLevel;
  title: string;
  description: string;
};

export function CapabilityCard({ level, title, description }: Props) {
  const accent =
    level === "direct"
      ? liquidIce.color.success
      : level === "shortcut"
        ? liquidIce.color.automation
        : liquidIce.color.confirmation;

  return (
    <ContentSurface emphasis="active" style={styles.card}>
      <View style={[styles.orb, { borderColor: accent }]}>
        <View style={[styles.orbCore, { backgroundColor: accent, shadowColor: accent }]} />
      </View>
      <View style={styles.content}>
        <CapabilityStatusChip level={level} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </ContentSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 118,
    borderRadius: 26,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden"
  },
  orb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.22)"
  },
  orbCore: {
    width: 11,
    height: 11,
    borderRadius: 99,
    shadowOpacity: 0.32,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  },
  content: {
    flex: 1,
    marginLeft: 14,
    alignItems: "flex-start"
  },
  title: {
    marginTop: 9,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: liquidIce.color.textPrimary
  },
  description: {
    marginTop: 4,
    ...liquidIce.type.bodyMedium,
    color: liquidIce.color.textSecondary
  }
});
