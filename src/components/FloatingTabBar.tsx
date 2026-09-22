import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { liquidIce } from "../theme/liquidIce";
import { GlassSurface } from "./GlassSurface";

export type AppTab = "ask" | "discover" | "you";

const labels: Record<AppTab, string> = {
  ask: "Fragen",
  discover: "Entdecken",
  you: "Du"
};

export function FloatingTabBar({ selected, onSelect }: { selected: AppTab; onSelect: (tab: AppTab) => void }) {
  return (
    <GlassSurface variant="floating" style={styles.bar}>
      {(["ask", "discover", "you"] as AppTab[]).map((tab) => {
        const active = selected === tab;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(tab)}
            style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
          >
            <View style={[styles.tabContent, active && styles.active]}>
              <Text style={active ? styles.activeText : styles.inactiveText}>{labels[tab]}</Text>
            </View>
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 58,
    borderRadius: 29,
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    gap: 4,
    overflow: "hidden"
  },
  pressable: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24
  },
  pressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    opacity: 0.82
  },
  tabContent: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  active: {
    backgroundColor: liquidIce.color.textPrimary
  },
  activeText: {
    ...liquidIce.type.labelLarge,
    color: "#FFFFFF"
  },
  inactiveText: {
    ...liquidIce.type.labelLarge,
    color: liquidIce.color.textSecondary,
    fontWeight: "500"
  }
});
