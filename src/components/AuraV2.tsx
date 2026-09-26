import React from "react";
import { StyleSheet, View } from "react-native";
import type { MotionPhase } from "../types";

export function AuraV2({ phase }: { phase: MotionPhase; reduceMotion: boolean }) {
  const active = phase === "diving" || phase === "searching" || phase === "emerging" || phase === "success";
  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.glow, phase === "success" && styles.successGlow]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    top: "22%",
    alignSelf: "center",
    backgroundColor: "rgba(62,106,225,0.055)"
  },
  successGlow: {
    backgroundColor: "rgba(46,125,50,0.05)"
  }
});
