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
            {active ? (
              <GlassSurface variant="inset" style={styles.active}>
                <Text style={styles.activeText}>{labels[tab]}</Text>
              </GlassSurface>
            ) : (
              <View style={styles.inactive}>
                <Text style={styles.inactiveText}>{labels[tab]}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 64,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    padding: 7,
    gap: 4,
    overflow: "hidden"
  },
  pressable: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25
  },
  pressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    opacity: 0.88
  },
  active: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  inactive: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.68
  },
  activeText: {
    ...liquidIce.type.labelLarge,
    color: liquidIce.color.textPrimary
  },
  inactiveText: {
    ...liquidIce.type.labelLarge,
    color: liquidIce.color.textTertiary,
    fontWeight: "500"
  }
});
